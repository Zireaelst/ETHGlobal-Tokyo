#[test_only]
module coffer::standing_order_tests;

use coffer::mandate::{Self, AgentCap, AgentMandate};
use coffer::standing_order::{Self, StandingOrder};
use coffer::treasury::{Self, Treasury, TreasuryAdminCap};
use coffer::vendor_registry::{Self, VendorPolicy};
use sui::balance;
use sui::clock::{Self, Clock};

const AGENT: address = @0x0;
const VENDOR: address = @0xCAFE;

public struct TEST_COIN has drop {}

#[test]
fun exact_due_time_executes_and_advances_schedule() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut order,
        clock,
    ) = setup_order(500, 3, 1_000, ctx);

    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );

    assert!(standing_order::execution_count(&order) == 1);
    assert!(standing_order::next_execution_at_ms(&order) == 2_000);
    assert!(treasury::vendor_committed_balance(&treasury) == 420);
    assert!(treasury::total_paid(&treasury) == 80);

    cleanup(treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock);
}

#[test, expected_failure(abort_code = 3, location = coffer::standing_order)]
fun early_execution_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut order,
        clock,
    ) = setup_order(500, 3, 999, ctx);

    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock);
}

#[test, expected_failure(abort_code = 3, location = coffer::standing_order)]
fun same_due_time_cannot_be_executed_twice() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut order,
        clock,
    ) = setup_order(500, 3, 1_000, ctx);

    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );
    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock);
}

#[test, expected_failure(abort_code = 4, location = coffer::mandate)]
fun revoked_mandate_stops_scheduled_payment() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut order,
        clock,
    ) = setup_order(500, 3, 1_000, ctx);
    mandate::revoke(&admin_cap, &treasury, &mut mandate);

    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock);
}

#[test, expected_failure(abort_code = 3, location = coffer::treasury)]
fun insufficient_bucket_balance_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut order,
        clock,
    ) = setup_order(50, 3, 1_000, ctx);

    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock);
}

#[test, expected_failure(abort_code = 5, location = coffer::standing_order)]
fun maximum_execution_count_is_enforced() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut order,
        mut clock,
    ) = setup_order(500, 1, 1_000, ctx);

    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );
    clock::set_for_testing(&mut clock, 2_000);
    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock);
}

#[test, expected_failure(abort_code = 2, location = coffer::standing_order)]
fun cancelled_order_cannot_execute() {
    let ctx = &mut tx_context::dummy();
    let (
        mut treasury,
        admin_cap,
        mut mandate,
        agent_cap,
        vendor_policy,
        mut order,
        clock,
    ) = setup_order(500, 3, 1_000, ctx);
    standing_order::cancel_order(&admin_cap, &treasury, &mut order);

    standing_order::execute_due_order(
        &agent_cap,
        &mut mandate,
        &vendor_policy,
        &mut treasury,
        &mut order,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock);
}

fun setup_order(
    committed_balance: u64,
    max_executions: u64,
    now_ms: u64,
    ctx: &mut TxContext,
): (
    Treasury<TEST_COIN>,
    TreasuryAdminCap,
    AgentMandate,
    AgentCap,
    VendorPolicy,
    StandingOrder,
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
        committed_balance,
    );
    let (mandate, agent_cap) = mandate::create_for_testing(
        treasury::id(&treasury),
        AGENT,
        100,
        1_000,
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
    let order = standing_order::create(
        &admin_cap,
        &treasury,
        VENDOR,
        80,
        treasury::vendor_committed_bucket(),
        1_000,
        1_000,
        10_000,
        max_executions,
        1,
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, now_ms);
    (treasury, admin_cap, mandate, agent_cap, vendor_policy, order, clock)
}

fun cleanup(
    treasury: Treasury<TEST_COIN>,
    admin_cap: TreasuryAdminCap,
    mandate: AgentMandate,
    agent_cap: AgentCap,
    vendor_policy: VendorPolicy,
    order: StandingOrder,
    clock: Clock,
) {
    clock::destroy_for_testing(clock);
    standing_order::destroy_for_testing(order);
    vendor_registry::destroy_for_testing(vendor_policy);
    mandate::destroy_for_testing(mandate, agent_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}
