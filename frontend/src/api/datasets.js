import { deleteDataset, getDataset, listDatasets, uploadDataset } from '../engine/datasetService'
import { call } from './localApi'

export const datasetsAPI = {
  upload: (file) => call(() => uploadDataset(file)),
  getById: (id) => call(() => getDataset(id)),
  getAll: () => call(listDatasets),
  delete: (id) => call(() => deleteDataset(id)),
}
