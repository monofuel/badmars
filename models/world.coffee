worldSchema = mongoose.Schema({
  name: String
  vertex_grid: Mixed
  movement_grid: Mixed
  settings: {
    seed: Number,
    water: Boolean,
    waterHeight: Number,
    cliffDelta: Number,
    chunkSize: Number
  }
})
