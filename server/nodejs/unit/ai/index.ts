import Context from '../../context';

export default interface UnitAI {
  actionable(ctx: Context, unit: Unit): Promise<boolean>;
  simulate(ctx: Context, unit: Unit): Promise<void>;
}
