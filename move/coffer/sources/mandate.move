module coffer::mandate;

use coffer::treasury::{Self, Treasury, TreasuryAdminCap};

const EAgentCapMismatch: u64 = 1;
const ETreasuryMismatch: u64 = 2;
const EAgentMismatch: u64 = 3;
const EMandateInactive: u64 = 4;
const EPerPaymentLimitExceeded: u64 = 5;
const EPeriodLimitExceeded: u64 = 6;
const EPolicyVersionMismatch: u64 = 7;
const EInvalidMandate: u64 = 8;
const EHumanApprovalRequired: u64 = 9;

#[allow(unused_field)]
public struct AgentMandate has key {
    id: UID,
    treasury_id: ID,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    period_spent: u64,
    period_started_at_ms: u64,
    period_duration_ms: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
    approval_threshold: u64,
    max_rebalance: u64,
    policy_version: u64,
    revoked: bool,
}

public struct AgentCap has key, store {
    id: UID,
    mandate_id: ID,
}

public fun create<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    period_duration_ms: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
    approval_threshold: u64,
    max_rebalance: u64,
    policy_version: u64,
    ctx: &mut TxContext,
): AgentCap {
    treasury::assert_admin(admin_cap, treasury);
    assert!(
        max_per_payment > 0 &&
            approval_threshold > 0 &&
            approval_threshold <= max_per_payment &&
            period_limit >= max_per_payment &&
            period_duration_ms > 0 &&
            valid_until_ms >= valid_from_ms &&
            policy_version == treasury::policy_version(treasury),
        EInvalidMandate,
    );
    let (mandate, cap) = new(
        treasury::id(treasury),
        agent,
        max_per_payment,
        period_limit,
        period_duration_ms,
        valid_from_ms,
        valid_until_ms,
        approval_threshold,
        max_rebalance,
        policy_version,
        ctx,
    );
    transfer::share_object(mandate);
    cap
}

fun new(
    treasury_id: ID,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    period_duration_ms: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
    approval_threshold: u64,
    max_rebalance: u64,
    policy_version: u64,
    ctx: &mut TxContext,
): (AgentMandate, AgentCap) {
    let mandate = AgentMandate {
        id: object::new(ctx),
        treasury_id,
        agent,
        max_per_payment,
        period_limit,
        period_spent: 0,
        period_started_at_ms: valid_from_ms,
        period_duration_ms,
        valid_from_ms,
        valid_until_ms,
        approval_threshold,
        max_rebalance,
        policy_version,
        revoked: false,
    };
    let agent_cap = AgentCap {
        id: object::new(ctx),
        mandate_id: object::id(&mandate),
    };
    (mandate, agent_cap)
}

public(package) fun authorize_and_record(
    cap: &AgentCap,
    mandate: &mut AgentMandate,
    treasury_id: ID,
    amount: u64,
    policy_version: u64,
    now_ms: u64,
    ctx: &TxContext,
) {
    assert!(cap.mandate_id == object::id(mandate), EAgentCapMismatch);
    assert!(mandate.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(mandate.agent == tx_context::sender(ctx), EAgentMismatch);
    assert!(
        !mandate.revoked &&
            now_ms >= mandate.valid_from_ms &&
            now_ms <= mandate.valid_until_ms,
        EMandateInactive,
    );
    assert!(mandate.policy_version == policy_version, EPolicyVersionMismatch);
    assert!(amount <= mandate.max_per_payment, EPerPaymentLimitExceeded);
    // Enforce the boundary between autonomous execution and the separate,
    // single-use human authorization path onchain.
    assert!(amount <= mandate.approval_threshold, EHumanApprovalRequired);

    if (now_ms >= mandate.period_started_at_ms + mandate.period_duration_ms) {
        mandate.period_started_at_ms = now_ms;
        mandate.period_spent = 0;
    };
    assert!(
        mandate.period_spent + amount <= mandate.period_limit,
        EPeriodLimitExceeded,
    );
    mandate.period_spent = mandate.period_spent + amount;
}

public(package) fun assert_agent_access(
    cap: &AgentCap,
    mandate: &AgentMandate,
    treasury_id: ID,
    now_ms: u64,
    ctx: &TxContext,
) {
    assert!(cap.mandate_id == object::id(mandate), EAgentCapMismatch);
    assert!(mandate.treasury_id == treasury_id, ETreasuryMismatch);
    assert!(mandate.agent == tx_context::sender(ctx), EAgentMismatch);
    assert!(
        !mandate.revoked &&
            now_ms >= mandate.valid_from_ms &&
            now_ms <= mandate.valid_until_ms,
        EMandateInactive,
    );
}

public fun period_spent(mandate: &AgentMandate): u64 { mandate.period_spent }
public fun policy_version(mandate: &AgentMandate): u64 { mandate.policy_version }
public fun treasury_id(mandate: &AgentMandate): ID { mandate.treasury_id }

public fun revoke<T>(
    admin_cap: &TreasuryAdminCap,
    treasury: &Treasury<T>,
    mandate: &mut AgentMandate,
) {
    treasury::assert_admin(admin_cap, treasury);
    assert!(mandate.treasury_id == treasury::id(treasury), ETreasuryMismatch);
    mandate.revoked = true;
}

#[test_only]
public fun create_for_testing(
    treasury_id: ID,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    policy_version: u64,
    ctx: &mut TxContext,
): (AgentMandate, AgentCap) {
    new(
        treasury_id,
        agent,
        max_per_payment,
        period_limit,
        10_000,
        0,
        10_000,
        max_per_payment,
        0,
        policy_version,
        ctx,
    )
}

#[test_only]
public fun create_with_approval_threshold_for_testing(
    treasury_id: ID,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    approval_threshold: u64,
    policy_version: u64,
    ctx: &mut TxContext,
): (AgentMandate, AgentCap) {
    new(
        treasury_id,
        agent,
        max_per_payment,
        period_limit,
        10_000,
        0,
        10_000,
        approval_threshold,
        0,
        policy_version,
        ctx,
    )
}

#[test_only]
public fun destroy_for_testing(mandate: AgentMandate, cap: AgentCap) {
    let AgentMandate {
        id,
        treasury_id: _,
        agent: _,
        max_per_payment: _,
        period_limit: _,
        period_spent: _,
        period_started_at_ms: _,
        period_duration_ms: _,
        valid_from_ms: _,
        valid_until_ms: _,
        approval_threshold: _,
        max_rebalance: _,
        policy_version: _,
        revoked: _,
    } = mandate;
    let AgentCap { id: cap_id, mandate_id: _ } = cap;
    object::delete(id);
    object::delete(cap_id);
}
