module coffer::standing_order;

use coffer::mandate::{Self, AgentCap, AgentMandate};
use coffer::receipt;
use coffer::treasury::{Self, Treasury, TreasuryAdminCap};
use coffer::vendor_registry::{Self, VendorPolicy};
use sui::clock::{Self, Clock};
use sui::coin;

const ETreasuryMismatch: u64 = 1;
const EOrderInactive: u64 = 2;
const EOrderNotDue: u64 = 3;
const EOrderEnded: u64 = 4;
const EMaximumExecutionsReached: u64 = 5;
const EPolicyVersionMismatch: u64 = 6;
const EInvalidSchedule: u64 = 7;
const EOrderCancelled: u64 = 8;

public struct StandingOrder has key {
    id: UID,
    treasury_id: ID,
    vendor: address,
    amount: u64,
    bucket: u8,
    interval_ms: u64,
    next_execution_at_ms: u64,
    end_at_ms: u64,
    execution_count: u64,
    max_executions: u64,
    policy_version: u64,
    active: bool,
    cancelled: bool,
}

public fun create<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    vendor: address,
    amount: u64,
    bucket: u8,
    interval_ms: u64,
    next_execution_at_ms: u64,
    end_at_ms: u64,
    max_executions: u64,
    policy_version: u64,
    ctx: &mut TxContext,
): StandingOrder {
    treasury::assert_admin(admin_cap, treasury);
    assert!(
        amount > 0 &&
            interval_ms > 0 &&
            max_executions > 0 &&
            next_execution_at_ms <= end_at_ms,
        EInvalidSchedule,
    );
    assert!(policy_version == treasury::policy_version(treasury), EPolicyVersionMismatch);
    StandingOrder {
        id: object::new(ctx),
        treasury_id: treasury::id(treasury),
        vendor,
        amount,
        bucket,
        interval_ms,
        next_execution_at_ms,
        end_at_ms,
        execution_count: 0,
        max_executions,
        policy_version,
        active: true,
        cancelled: false,
    }
}

public fun create_shared<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    vendor: address,
    amount: u64,
    bucket: u8,
    interval_ms: u64,
    next_execution_at_ms: u64,
    end_at_ms: u64,
    max_executions: u64,
    policy_version: u64,
    ctx: &mut TxContext,
) {
    let order = create(
        admin_cap,
        treasury,
        vendor,
        amount,
        bucket,
        interval_ms,
        next_execution_at_ms,
        end_at_ms,
        max_executions,
        policy_version,
        ctx,
    );
    transfer::share_object(order);
}

public fun execute_due_order<T>(
    agent_cap: &AgentCap,
    agent_mandate: &mut AgentMandate,
    vendor_policy: &VendorPolicy,
    treasury: &mut Treasury<T>,
    order: &mut StandingOrder,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let treasury_id = treasury::id(treasury);
    let now_ms = clock::timestamp_ms(clock);
    assert!(order.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(order.execution_count < order.max_executions, EMaximumExecutionsReached);
    assert!(order.active, EOrderInactive);
    assert!(now_ms >= order.next_execution_at_ms, EOrderNotDue);
    assert!(now_ms <= order.end_at_ms, EOrderEnded);
    assert!(order.policy_version == treasury::policy_version(treasury), EPolicyVersionMismatch);

    vendor_registry::assert_payment_allowed(
        vendor_policy,
        treasury_id,
        order.vendor,
        order.amount,
        order.bucket,
        now_ms,
    );
    mandate::authorize_and_record(
        agent_cap,
        agent_mandate,
        treasury_id,
        order.amount,
        order.policy_version,
        now_ms,
        ctx,
    );

    let funds = treasury::withdraw_for_payment(treasury, order.bucket, order.amount);
    let payment = coin::from_balance(funds, ctx);
    transfer::public_transfer(payment, order.vendor);

    order.execution_count = order.execution_count + 1;
    order.next_execution_at_ms = order.next_execution_at_ms + order.interval_ms;
    treasury::record_payment(treasury, order.amount);
    receipt::emit_standing_order_executed(
        object::id(order),
        treasury_id,
        order.vendor,
        order.amount,
        order.policy_version,
    );
}

public fun pause_order<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    order: &mut StandingOrder,
) {
    assert_order_admin(admin_cap, treasury, order);
    assert!(!order.cancelled, EOrderCancelled);
    order.active = false;
}

public fun resume_order<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    order: &mut StandingOrder,
) {
    assert_order_admin(admin_cap, treasury, order);
    assert!(!order.cancelled, EOrderCancelled);
    order.active = true;
}

public fun cancel_order<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    order: &mut StandingOrder,
) {
    assert_order_admin(admin_cap, treasury, order);
    order.active = false;
    order.cancelled = true;
}

fun assert_order_admin<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    order: &StandingOrder,
) {
    treasury::assert_admin(admin_cap, treasury);
    assert!(order.treasury_id == treasury::id(treasury), ETreasuryMismatch);
}

public fun execution_count(order: &StandingOrder): u64 { order.execution_count }
public fun next_execution_at_ms(order: &StandingOrder): u64 { order.next_execution_at_ms }
public fun is_active(order: &StandingOrder): bool { order.active }

#[test_only]
public fun destroy_for_testing(order: StandingOrder) {
    let StandingOrder {
        id,
        treasury_id: _,
        vendor: _,
        amount: _,
        bucket: _,
        interval_ms: _,
        next_execution_at_ms: _,
        end_at_ms: _,
        execution_count: _,
        max_executions: _,
        policy_version: _,
        active: _,
        cancelled: _,
    } = order;
    object::delete(id);
}
