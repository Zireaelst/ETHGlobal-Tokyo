#[test_only]
module coffer::payment_policy_tests;

use coffer::mandate::{Self, AgentCap, AgentMandate};
use coffer::payment_request::{Self, PaymentRequest};
use coffer::treasury::{Self, Treasury, TreasuryAdminCap};
use coffer::vendor_registry::{Self, VendorPolicy};
use sui::balance;
use sui::clock::{Self, Clock};

const AGENT: address = @0x0;
const VENDOR: address = @0xCAFE;

public struct TEST_COIN has drop {}

#[test]
fun approved_vendor_payment_executes_within_mandate() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    treasury::deposit_operating_for_testing(
        &mut treasury,
        balance::create_for_testing<TEST_COIN>(1_000),
    );
    treasury::admin_rebalance(
        &admin_cap,
        &mut treasury,
        treasury::operating_bucket(),
        treasury::vendor_committed_bucket(),
        500,
    );

    let (mut mandate, agent_cap) = mandate::create_for_testing(
        treasury::id(&treasury),
        AGENT,
        100,
        500,
        1,
        ctx,
    );
    let vendor_policy = vendor_registry::create_for_testing(
        treasury::id(&treasury),
        VENDOR,
        100,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );
    let mut request = payment_request::create_for_testing(
        treasury::id(&treasury),
        VENDOR,
        80,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, 1_000);

    payment_request::execute_within_mandate(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    assert!(payment_request::is_paid(&request));
    assert!(mandate::period_spent(&mandate) == 80);
    assert!(treasury::vendor_committed_balance(&treasury) == 420);
    assert!(treasury::total_paid(&treasury) == 80);

    clock::destroy_for_testing(clock);
    payment_request::destroy_for_testing(request);
    vendor_registry::destroy_for_testing(vendor_policy);
    mandate::destroy_for_testing(mandate, agent_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 5, location = coffer::mandate)]
fun payment_above_single_limit_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (mut treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    treasury::deposit_operating_for_testing(
        &mut treasury,
        balance::create_for_testing<TEST_COIN>(1_000),
    );
    treasury::admin_rebalance(
        &admin_cap,
        &mut treasury,
        treasury::operating_bucket(),
        treasury::vendor_committed_bucket(),
        500,
    );
    let (mut mandate, agent_cap) = mandate::create_for_testing(
        treasury::id(&treasury),
        AGENT,
        100,
        500,
        1,
        ctx,
    );
    let vendor_policy = vendor_registry::create_for_testing(
        treasury::id(&treasury),
        VENDOR,
        500,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );
    let mut request = payment_request::create_for_testing(
        treasury::id(&treasury),
        VENDOR,
        101,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        1,
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, 1_000);

    payment_request::execute_within_mandate(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    clock::destroy_for_testing(clock);
    payment_request::destroy_for_testing(request);
    vendor_registry::destroy_for_testing(vendor_policy);
    mandate::destroy_for_testing(mandate, agent_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}

#[test, expected_failure(abort_code = 3, location = coffer::vendor_registry)]
fun unknown_vendor_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut request,
        clock,
    ) = setup_request(80, @0xBEEF, VENDOR, 500, 1, ctx);

    payment_request::execute_within_mandate(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    cleanup(
        treasury,
        admin_cap,
        mandate,
        agent_cap,
        vendor_policy,
        request,
        clock,
    );
}

#[test, expected_failure(abort_code = 2, location = coffer::payment_request)]
fun paid_request_cannot_be_replayed() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut request,
        clock,
    ) = setup_request(80, VENDOR, VENDOR, 500, 1, ctx);

    payment_request::execute_within_mandate(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );
    payment_request::execute_within_mandate(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    cleanup(
        treasury,
        admin_cap,
        mandate,
        agent_cap,
        vendor_policy,
        request,
        clock,
    );
}

#[test, expected_failure(abort_code = 6, location = coffer::mandate)]
fun period_limit_is_enforced() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut request,
        clock,
    ) = setup_request(80, VENDOR, VENDOR, 50, 1, ctx);

    payment_request::execute_within_mandate(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    cleanup(
        treasury,
        admin_cap,
        mandate,
        agent_cap,
        vendor_policy,
        request,
        clock,
    );
}

#[test, expected_failure(abort_code = 5, location = coffer::payment_request)]
fun stale_policy_version_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut request,
        clock,
    ) = setup_request(80, VENDOR, VENDOR, 500, 2, ctx);

    payment_request::execute_within_mandate(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut request,
        &clock,
        ctx,
    );

    cleanup(
        treasury,
        admin_cap,
        mandate,
        agent_cap,
        vendor_policy,
        request,
        clock,
    );
}

fun setup_request(
    amount: u64,
    request_vendor: address,
    approved_vendor: address,
    period_limit: u64,
    request_policy_version: u64,
    ctx: &mut TxContext,
): (
    Treasury<TEST_COIN>,
    TreasuryAdminCap,
    AgentMandate,
    AgentCap,
    VendorPolicy,
    PaymentRequest,
    Clock,
) {
    let (mut treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    treasury::deposit_operating_for_testing(
        &mut treasury,
        balance::create_for_testing<TEST_COIN>(1_000),
    );
    treasury::admin_rebalance(
        &admin_cap,
        &mut treasury,
        treasury::operating_bucket(),
        treasury::vendor_committed_bucket(),
        500,
    );
    let (mandate, agent_cap) = mandate::create_for_testing(
        treasury::id(&treasury),
        AGENT,
        100,
        period_limit,
        1,
        ctx,
    );
    let vendor_policy = vendor_registry::create_for_testing(
        treasury::id(&treasury),
        approved_vendor,
        500,
        treasury::vendor_committed_bucket(),
        10_000,
        ctx,
    );
    let request = payment_request::create_for_testing(
        treasury::id(&treasury),
        request_vendor,
        amount,
        treasury::vendor_committed_bucket(),
        1_000,
        5_000,
        request_policy_version,
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, 1_000);
    (
        treasury,
        admin_cap,
        mandate,
        agent_cap,
        vendor_policy,
        request,
        clock,
    )
}

fun cleanup(
    treasury: Treasury<TEST_COIN>,
    admin_cap: TreasuryAdminCap,
    mandate: AgentMandate,
    agent_cap: AgentCap,
    vendor_policy: VendorPolicy,
    request: PaymentRequest,
    clock: Clock,
) {
    clock::destroy_for_testing(clock);
    payment_request::destroy_for_testing(request);
    vendor_registry::destroy_for_testing(vendor_policy);
    mandate::destroy_for_testing(mandate, agent_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}
