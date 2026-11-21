import { deleteDataset, getDataset, listDatasets, uploadDataset } from '../engine/datasetService'
import { loadSampleDataset } from '../engine/sampleData'
import { runOnDataset } from '../engine/session'
import { runSelect } from '../engine/select'
import { call } from './localApi'

export const datasetsAPI = {
  upload: (file) => call(() => uploadDataset(file)),
  loadSample: () => call(() => loadSampleDataset()),
  getById: (id) => call(() => getDataset(id)),
  getAll: () => call(listDatasets),
  delete: (id) => call(() => deleteDataset(id)),
  query: (id, sql, options) => call(() => runOnDataset(id, (runner) => runSelect(runner, sql, options))),
}
