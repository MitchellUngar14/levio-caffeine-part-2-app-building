import { InMemoryStore } from "./memory-store";
import { storeContract } from "./testing";

storeContract("InMemoryStore", () => new InMemoryStore());
