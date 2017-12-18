import { Config } from "./config";
import GameState from "./state";

export interface PreloadHash {
    state: Partial<GameState>
    config: Partial<Config>
}