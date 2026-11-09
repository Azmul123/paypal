/**
 * FlowPilot — Module 1: Dispute Management
 * Automated API & Integration Test Suite
 */

const http = require('http');
const app = require('../index');
const paypalService = require('../services/paypalService');
const supabaseService = require('../services/supabaseService');

let server;
const PORT = 5099;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body ? JSON.parse(body) : null
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: body
            });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 FlowPilot Dispute Management Automated Test Suite');
  console.log('====================================================\n');

  server = app.listen(PORT);

  try {
    // 1. Health check
    console.log('[Suite 1: System Health & Base Routes]');
    const health = await request('/api/health');
    assert(health.statusCode === 200, 'GET /api/health returns 200 OK');
    assert(health.body.product === 'FlowPilot', 'Product name is FlowPilot');
    assert(health.body.module === 'Dispute Management', 'Module is Dispute Management');

    // 2. Overview Stats (Dashboard)
    console.log('\n[Suite 2: Dashboard Overview & KPI Metrics]');
    const statsRes = await request('/api/disputes/stats/overview');
    assert(statsRes.statusCode === 200, 'GET /api/disputes/stats/overview returns 200');
    assert(typeof statsRes.body.stats.totalDisputes === 'number', 'totalDisputes is a number');
    assert(statsRes.body.stats.totalDisputes > 0, 'Demo dataset loads sample disputes (>0)');
    assert(typeof statsRes.body.stats.openDisputes === 'number', 'openDisputes is calculated');
    assert(typeof statsRes.body.stats.attentionRequired === 'number', 'attentionRequired count exists');
    assert(statsRes.body.dataSource === 'demo', 'Initially correctly identified as Demo mode');

    // 3. Dispute Listing & Filters
    console.log('\n[Suite 3: Dispute Listing, Search, and Filtering]');
    const listRes = await request('/api/disputes');
    assert(listRes.statusCode === 200, 'GET /api/disputes returns 200');
    assert(Array.isArray(listRes.body.data), 'Returns array of disputes');
    assert(listRes.body.data.length > 0, 'Disputes list contains records');

    // Verify standardized schema
    const sample = listRes.body.data[0];
    assert(Boolean(sample.id), 'Dispute has standard id');
    assert(Boolean(sample.paypalDisputeId), 'Dispute has paypalDisputeId');
    assert(Boolean(sample.transactionId), 'Dispute has transactionId');
    assert(Boolean(sample.reason), 'Dispute has reason');
    assert(typeof sample.amount === 'number', 'Dispute amount is numeric');
    assert(sample.source === 'demo', 'Mock record has source="demo"');

    // Test Search filter
    const searchRes = await request('/api/disputes?search=Marcus');
    assert(searchRes.statusCode === 200, 'Search by buyer name returns 200');
    assert(searchRes.body.data.length >= 1, 'Search finds matching buyer Marcus');
    assert(searchRes.body.data[0].customer.name.includes('Marcus'), 'Found record matches search query');

    // Test Status filter
    const statusRes = await request('/api/disputes?status=RESOLVED');
    assert(statusRes.statusCode === 200, 'Filter by status returns 200');
    const allResolved = statusRes.body.data.every((d) => d.status === 'RESOLVED');
    assert(allResolved, 'All returned records have status RESOLVED');

    // Test Empty Search State
    const emptyRes = await request('/api/disputes?search=NonExistentQueryXYZ123');
    assert(emptyRes.statusCode === 200, 'Empty search query returns 200');
    assert(emptyRes.body.data.length === 0, 'Empty search returns 0 results gracefully');

    // 4. Dispute Detail
    console.log('\n[Suite 4: Dispute Detail Retrieval & 404 Handling]');
    const targetId = listRes.body.data[0].id;
    const detailRes = await request(`/api/disputes/${targetId}`);
    assert(detailRes.statusCode === 200, `GET /api/disputes/${targetId} returns 200`);
    assert(detailRes.body.data.id === targetId, 'Returned dispute matches requested ID');
    assert(Array.isArray(detailRes.body.data.messages), 'Dispute detail contains messages array');
    assert(Boolean(detailRes.body.data.customer), 'Dispute detail contains customer info');

    // 404 on nonexistent dispute
    const notFoundRes = await request('/api/disputes/disp_does_not_exist_999');
    assert(notFoundRes.statusCode === 404, 'Non-existent dispute ID returns 404 Not Found');
    assert(notFoundRes.body.success === false, '404 error payload structure is valid');

    // 5. PayPal Sandbox Connection & Auth Failure Handling
    console.log('\n[Suite 5: PayPal Connection & Security Validation]');
    const paypalStatus = await request('/api/paypal/status');
    assert(paypalStatus.statusCode === 200, 'GET /api/paypal/status returns 200');
    assert(paypalStatus.body.mode === 'demo', 'Status reports demo mode when unconfigured');

    // Test PayPal Auth Failure with fake credentials
    const fakeAuth = await request('/api/paypal/test', {
      method: 'POST',
      body: {
        clientId: 'FAKE_CLIENT_ID_1234567890',
        clientSecret: 'FAKE_SECRET_0987654321'
      }
    });
    assert(fakeAuth.statusCode === 401, 'Testing invalid PayPal credentials fails with 401 Unauthorized');
    assert(fakeAuth.body.success === false, 'Returns error for invalid credentials');

    // Test Connect Validation
    const emptyConnect = await request('/api/paypal/connect', {
      method: 'POST',
      body: {}
    });
    assert(emptyConnect.statusCode === 400, 'Empty connect body returns 400 Bad Request');

    // 6. Integration Specifications (Modules 2, 3, 4)
    console.log('\n[Suite 6: Shared Architecture & Contracts Contract Check]');
    const contractsRes = await request('/api/integration/contracts');
    assert(contractsRes.statusCode === 200, 'GET /api/integration/contracts returns 200');
    assert(Boolean(contractsRes.body.sharedDisputeSchema), 'Shared dispute schema is documented');
    assert(Boolean(contractsRes.body.interfacesForOtherModules.module2_EvidenceManagement), 'Module 2 interface is defined');
    assert(Boolean(contractsRes.body.interfacesForOtherModules.module3_AIEvidenceIntelligence), 'Module 3 interface is defined');
    assert(Boolean(contractsRes.body.interfacesForOtherModules.module4_DisputeResponseResolution), 'Module 4 interface is defined');

    // 7. Supabase Service Verification
    console.log('\n[Suite 7: Supabase Integration & In-Memory Fallback]');
    const supaCheck = await supabaseService.testConnection();
    assert(typeof supaCheck.configured === 'boolean', 'Supabase status check returns configured boolean');
    assert(supaCheck.provider === 'in_memory' || supaCheck.provider === 'supabase', 'Database provider is identified');

    console.log('\n====================================================');
    console.log(`Summary: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
