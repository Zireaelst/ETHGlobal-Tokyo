#[test_only]
module coffer::document_policy_tests;

use coffer::document_policy;
use coffer::mandate::{Self, AgentCap, AgentMandate};
use coffer::treasury::{Self, Treasury, TreasuryAdminCap};
use sui::clock::{Self, Clock};

const AGENT: address = @0x0;

public struct TEST_COIN has drop {}

#[test]
fun active_agent_can_approve_treasury_document_decryption() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap, mandate, agent_cap, clock) = setup(ctx);

    document_policy::seal_approve(
        treasury::id(&treasury).to_bytes(),
        &treasury,
        &mandate,
        &agent_cap,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, clock);
}

#[test, expected_failure(abort_code = 1, location = coffer::document_policy)]
fun another_treasury_identity_is_rejected() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap, mandate, agent_cap, clock) = setup(ctx);

    document_policy::seal_approve(
        vector[1, 2, 3],
        &treasury,
        &mandate,
        &agent_cap,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, clock);
}

#[test, expected_failure(abort_code = 4, location = coffer::mandate)]
fun revoked_agent_cannot_decrypt_treasury_documents() {
    let ctx = &mut tx_context::dummy();
    let (treasury, admin_cap, mut mandate, agent_cap, clock) = setup(ctx);
    mandate::revoke(&admin_cap, &treasury, &mut mandate);

    document_policy::seal_approve(
        treasury::id(&treasury).to_bytes(),
        &treasury,
        &mandate,
        &agent_cap,
        &clock,
        ctx,
    );

    cleanup(treasury, admin_cap, mandate, agent_cap, clock);
}

fun setup(
    ctx: &mut TxContext,
): (
    Treasury<TEST_COIN>,
    TreasuryAdminCap,
    AgentMandate,
    AgentCap,
    Clock,
) {
    let (treasury, admin_cap) = treasury::create_for_testing<TEST_COIN>(ctx);
    let (mandate, agent_cap) = mandate::create_for_testing(
        treasury::id(&treasury),
        AGENT,
        100,
        1_000,
        1,
        ctx,
    );
    let mut clock = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut clock, 1_000);
    (treasury, admin_cap, mandate, agent_cap, clock)
}

fun cleanup(
    treasury: Treasury<TEST_COIN>,
    admin_cap: TreasuryAdminCap,
    mandate: AgentMandate,
    agent_cap: AgentCap,
    clock: Clock,
) {
    clock::destroy_for_testing(clock);
    mandate::destroy_for_testing(mandate, agent_cap);
    treasury::destroy_for_testing(treasury, admin_cap);
}
