/// Seal access policy for encrypted treasury documents.
///
/// The Seal identity is the 32-byte treasury object ID. Decryption requires
/// the active agent's owned AgentCap and its matching mandate. Seal key servers
/// evaluate this entry function through a dry-run; it does not mutate state.
module coffer::document_policy;

use coffer::mandate::{Self, AgentCap, AgentMandate};
use coffer::treasury::{Self, Treasury};
use sui::clock::{Self, Clock};

const EWrongTreasuryIdentity: u64 = 1;

public entry fun seal_approve<T>(
    id: vector<u8>,
    treasury: &Treasury<T>,
    mandate: &AgentMandate,
    agent_cap: &AgentCap,
    clock: &Clock,
    ctx: &TxContext,
) {
    let treasury_id = treasury::id(treasury);
    assert!(id == treasury_id.to_bytes(), EWrongTreasuryIdentity);
    mandate::assert_agent_access(
        agent_cap,
        mandate,
        treasury_id,
        clock::timestamp_ms(clock),
        ctx,
    );
}
