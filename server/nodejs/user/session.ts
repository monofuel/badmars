
// session types from grpc:
// 0 is unknown
// 1 is bearer

export default interface Session {
  token: string;
  user: UUID;
  type: number;
}
