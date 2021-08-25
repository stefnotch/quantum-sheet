import { fileOpen, directoryOpen, fileSave, supported, FileWithHandle, FileWithDirectoryHandle } from 'browser-fs-access'
import { get, set } from 'idb-keyval'
import { computed, readonly, ref, shallowReactive, shallowRef, toRaw, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'

interface DatabaseFile {
  /** ID to uniquely identify this particular file */
  id: string
  /** Handle to the actual file on the harddisk */
  fileHandle: FileWithHandle
}

const files = shallowReactive<Map<string, DatabaseFile>>(new Map<string, DatabaseFile>())
const isLoaded = ref(false)

const initPromise = Promise.allSettled([
  get<Map<string, DatabaseFile>>('documents').then((v) => {
    if (v) {
      for (const entry of v.entries()) {
        files.set(entry[0], entry[1])
      }
    }
  }),
]).then((v) => {
  isLoaded.value = true
  return v
})

export function useDocumentStorage() {
  /** Adds a file-handle to the storage and returns its ID */
  async function addFile(file: FileWithHandle): Promise<string> {
    await initPromise

    // Deduplicate file handles
    if (file.handle) {
      for (const existingFile of files.values()) {
        if (existingFile.fileHandle.handle && file.handle.isSameEntry(existingFile.fileHandle.handle)) {
          return existingFile.id
        }
      }
    }

    const id = uuidv4()
    const databaseFile: DatabaseFile = {
      id,
      fileHandle: file,
    }
    files.set(id, databaseFile)

    await set('documents', toRaw(files))

    return id
  }

  async function removeFile(id: string) {
    if (files.delete(id)) {
      await set('documents', toRaw(files))
    }
  }

  /** Gets the actual content of a file */
  async function getFileContent(id: string): Promise<string | undefined> {
    await initPromise

    const databaseFile = files.get(id)
    if (!databaseFile) return
    const fileContent = await databaseFile.fileHandle.text()
    return fileContent
  }

  /** Saves a file back to the harddisk */
  async function saveFile(opts: { id?: string; name?: string; content: string }) {
    const databaseFile = opts.id ? files.get(opts.id) : undefined
    const name = opts.name ?? databaseFile?.fileHandle.name ?? 'document'
    const hasExtension = /\.qd/.test(name)

    await fileSave(
      new Blob([opts.content], {
        type: 'text/plain',
      }),
      {
        fileName: hasExtension ? name : name + '.qd',
        extensions: ['.qd'],
      },
      databaseFile?.fileHandle?.handle
    )
  }

  return {
    isLoaded,
    addFile,
    removeFile,
    getFileContent,
    saveFile,
    files: computed(() =>
      Array.from(files.values()).map((v) => {
        return {
          id: v.id,
          name: v.fileHandle.name,
        }
      })
    ),
  }
}

/*

  // Open file --> added to file storage (which reads the text, notes it down in the indexeddb, ...)
  // When the user hits "save" --> file saved (disk and indexeddb, file storage takes care of it)
  async function openFile() {
    if (!(await unsavedChangesModal.showIfUnsavedChanges(notebookStorage))) {
      return
    }
    try {
      const selectedFiles = await fileOpen({
        extensions: ['.qd'],
        multiple: true,
      })
      const fileIds = await Promise.allSettled(selectedFiles.map((f) => notebookStorage.addFile(f)))
      const fileId = fileIds.find((v) => v.status === 'fulfilled')
      if (fileId?.status === 'fulfilled') {
        await notebookStorage.showFile(fileId.value)
      } else {
        console.warn(fileIds)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        return console.error(err)
      } else {
        console.warn(err)
      }
    }
  }

  async function saveShownFile() {
    try {
      const notebook = shownNotebook.value

      if (notebook) {
        hasUnsavedChanges.value = false
        await saveFile(notebook)
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      } else {
        throw err
      }
    }
  }*/
