import mongoose from 'mongoose'
import urlRegex from 'url-regex-safe'

import { getPageDescriptors } from '../util/pagination.js'

const tuneSchema = new mongoose.Schema(
  {
    album: String,
    artist: { type: String, required: true },
    score: { type: Number, index: true, default: 0 },
    title: { type: String, required: true },
    url: { type: String, match: urlRegex({ exact: true }) },
    votes: [
      {
        comment: String,
        createdAt: { type: Date, default: Date.now },
        offset: { type: Number, required: true, min: -1, max: 1 },
      },
    ],
  },
  {
    collation: { locale: 'en_US', strength: 1 },
    strict: 'throw',
    strictQuery: true,
    timestamps: true,
    useNestedStrict: true,
  }
)
tuneSchema.index(
  { album: 'text', artist: 'text', title: 'text' },
  { name: 'search', weights: { title: 10, artist: 5, album: 1 } }
)
tuneSchema.statics.search = search
tuneSchema.methods.vote = vote

const Tune = mongoose.model('Tune', tuneSchema)

export default Tune

async function search({
  filter,
  page = 1,
  pageSize = 10,
  sorting = '-createdAt',
} = {}) {
  page = Number(page) || 1
  pageSize = Number(pageSize) || 10
  let scope = this.find().sort(sorting).limit(pageSize)

  if (page > 1) {
    scope = scope.skip((page - 1) * pageSize)
  }

  filter = String(filter || '').trim()
  if (filter) {
    scope = scope.where({ $text: { $search: filter } })
  }

  const countQuery = this.find(scope.getQuery())
  const totalCount = await (filter
    ? countQuery.countDocuments()
    : countQuery.estimatedDocumentCount())
  const links = getPageDescriptors({ page, pageSize, totalCount })

  return {
    links,
    tunes: await scope,
  }
}

async function vote({ offset, comment }) {
  offset = Math.sign(Number(offset) || 0)
  comment = String(comment || '').trim()

  if (offset === 0) {
    return this
  }

  const vote = { offset }
  if (comment) {
    vote.comment = comment
  }

  return Tune.findOneAndUpdate(
    { _id: this.id },
    { $inc: { score: offset }, $push: { votes: vote } },
    { new: true }
  )
}
