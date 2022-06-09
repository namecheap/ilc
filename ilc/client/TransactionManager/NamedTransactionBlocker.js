import TransactionBlocker from "./TransactionBlocker";

export default class NamedTransactionBlocker extends TransactionBlocker {
    #externalId;
  
    constructor(externalId, blockerExecutor) {
        super(blockerExecutor);
        this.#externalId = externalId;
    }

    getId() {
        return this.#externalId;
    }
}
