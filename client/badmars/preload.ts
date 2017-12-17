import { Config } from "./config";
import State from "./state";

export interface PreloadHash {
    state: Partial<State>
    config: Partial<Config>
}