function simulateTransaction(type, amount) {

    return new Promise(function(resolve, reject) {

        setTimeout(function() {

            if (type === "Withdraw" && amount > balance) {

                reject(
                    new Error("Insufficient balance.")
                );

                return;
            }

            if (
                type === "Deposit" &&
                !Number.isSafeInteger(balance + amount)
            ) {

                reject(
                    new Error("Balance exceeds the supported range.")
                );

                return;
            }
            if (
                Math.random() < 0.2
            ) {
                reject(new Error("Simulated network error."));
                return;
            }

            resolve({
                type: type,
                amount: amount,
                success: true
            });

        }, processingDelay);

    });
}
