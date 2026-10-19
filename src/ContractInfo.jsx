export default function ContractInfo({
    contractAddress,
    network,
    chainId,
    deploymentBlock
}) {
    return (
        <section className="contract-info" aria-label="Contract information">
            <h3>Contract Information</h3>
            <dl>
                <div>
                    <dt>Contract Address</dt>
                    <dd>{contractAddress}</dd>
                </div>
                <div>
                    <dt>Network</dt>
                    <dd>{network}</dd>
                </div>
                <div>
                    <dt>Chain ID</dt>
                    <dd>{chainId || "Not detected"}</dd>
                </div>
                <div>
                    <dt>Deployment Block</dt>
                    <dd>{deploymentBlock}</dd>
                </div>
            </dl>
        </section>
    );
}
