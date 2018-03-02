import Context from '../context';

export interface Env {
    nodeEnv: 'dev' | 'prod';
    debug: boolean;
    validate: boolean;

    ticksPerSec: number;
    stressTest: boolean;
}

export interface Service {
    init(ctx: Context): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
