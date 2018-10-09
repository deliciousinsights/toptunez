import { getPageDescriptors } from '../util/pagination.js'
import mongoose from 'mongoose'
import urlRegex from 'url-regex-safe'

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
