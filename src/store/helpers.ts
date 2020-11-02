import { SocketState, FileChangeSocketResponse, ChartDataSet } from './socket/types'
import { FileListChangeInfo, KlipperFileWithMeta, Thumbnail } from './files/types'

/**
 * Return a file thumb if one exists
 * Optionally, pick the largest or smallest image.
 */
export const getThumb = (file: KlipperFileWithMeta, goLarge = true) => {
  if (
    file.thumbnails &&
    file.thumbnails.length
  ) {
    const thumbs = file.thumbnails
    let thumb: Thumbnail | undefined
    if (thumbs) {
      if (goLarge) {
        thumb = thumbs.reduce((a, c) => (a.size && c.size && (a.size > c.size)) ? a : c)
      } else {
        thumb = thumbs.reduce((a, c) => (a.size && c.size && (a.size < c.size)) ? a : c)
      }
      if (thumb && thumb.data && thumb.data !== null) {
        return { ...thumb, data: 'data:image/gif;base64,' + thumb.data }
      }
    }
  }
  return undefined
}

/**
 * Takes the file list changed information and formats
 * it for us.
 * The user can only change the file name, or its path -
 * but not both at once.
 */
export const getFileListChangeInfo = (payload: FileChangeSocketResponse): FileListChangeInfo => {
  // Determine the old and new path;
  // Determine the old and new item (if relevent..);
  // Note, the item could represent a folder or file.
  const root = payload.item.root
  const path = payload.item.path.substr(0, payload.item.path.lastIndexOf('/'))
  let r = {
    root,
    destination: {
      item: payload.item.path.split('/').pop() || '',
      path,
      notifyPath: (path.length === 0) ? root : root + '/' + path
    }
  }

  if (payload.source_item) {
    const sourcePath = payload.source_item.path.substr(0, payload.source_item.path.lastIndexOf('/'))
    r = {
      ...r,
      ...{
        source: {
          item: payload.source_item.path.split('/').pop(),
          path: sourcePath,
          notifyPath: (sourcePath.length === 0) ? root : root + '/' + sourcePath
        }
      }
    }
  }
  return r
}

/**
 * Prepare packet data for a chart entry.
 * Every packet can have both a current temperature
 * and a target. Determine if they SHOULD have targets by
 * looking at the config object. If this update is the target,
 * use the existing temp. If this update is the temp, use
 * the existing target.
 * @param key The sensor key to update.
 * @param val The value being passed. We can tell if its a temp or target due to its property name.
 */
export const configureChartEntry = (key: string, val: {[key: string]: number }, state: SocketState) => {
  const config = state.printer[key]
  let label = key
  if (key.includes(' ')) label = key.split(' ')[1]

  const now = new Date() // Common date for this data.
  const r: {temperature?: ChartDataSet; target?: ChartDataSet} = {}

  if ('temperature' in val) {
    r.temperature = {
      label,
      data: [{ x: now, y: val.temperature }]
    }
  } else {
    r.temperature = {
      label,
      data: [{ x: now, y: config.temperature }]
    }
  }

  if ('target' in val) {
    r.target = {
      label: `${label}Target`,
      data: [{ x: now, y: val.target }]
    }
  } else {
    if ('target' in config) {
      r.target = {
        label: `${label}Target`,
        data: [{ x: now, y: config.target }]
      }
    }
  }

  return r
}
