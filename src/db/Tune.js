import mongoose from 'mongoose'
import urlRegex from 'url-regex'

import connection from './connection.js'

const tuneSchema = new mongoose.Schema(
  {
    album: String,
    artist: { type: String, required: true },
    score: { type: Number, index: true, default: 0 },
    title: { type: String, required: true },
    url: { type: String, match: urlRegex({ exact: true }) },
  },
  {
    collation: { locale: 'en_US', strength: 1 },
    strict: 'throw',
    timestamps: true,
  }
)
tuneSchema.index(
  { album: 'text', artist: 'text', title: 'text' },
  { name: 'search', weights: { title: 10, artist: 5, album: 1 } }
)

const Tune = connection.model('Tune', tuneSchema)

export default Tune
