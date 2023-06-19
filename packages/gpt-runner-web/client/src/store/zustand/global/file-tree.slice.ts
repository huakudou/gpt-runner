import type { StateCreator } from 'zustand'
import { type FileInfoTreeItem, travelTree } from '@nicepkg/gpt-runner-shared/common'
import type { GetState } from '../types'
import type { TreeItemBaseState } from '../../../components/tree-item'
import type { ChatSlice } from './chat.slice'

export type FileInfoSidebarTreeItem = FileInfoTreeItem & {
  checked: boolean
}

export type FileSidebarTreeItem = TreeItemBaseState<FileInfoSidebarTreeItem>

export interface FileTreeSlice {
  filePathsTreePrompt: string
  provideFilePathsTreePromptToGpt: boolean
  expendedFilePaths: string[]
  checkedFilePaths: string[]
  updateProvideFilePathsTreePromptToGpt: (provideFilePathsTreePromptToGpt: boolean) => void
  updateFilePathsTreePrompt: (promptOrFileTreeItem: string | FileSidebarTreeItem[]) => void
  updateExpendedFilePaths: (expendedFilePaths: string[] | ((oldExpendedFilePaths: string[]) => string[])) => void
  updateCheckedFilePaths: (checkedFilePaths: string[] | ((oldCheckedFilePaths: string[]) => string[])) => void
}

export type FileTreeState = GetState<FileTreeSlice>

function getInitialState() {
  return {
    filePathsTreePrompt: '',
    provideFilePathsTreePromptToGpt: false,
    expendedFilePaths: [],
    checkedFilePaths: [],
  } satisfies FileTreeState
}

export const createFileTreeSlice: StateCreator<
  FileTreeSlice & ChatSlice,
  [],
  [],
  FileTreeSlice
> = (set, get) => ({
  ...getInitialState(),
  updateProvideFilePathsTreePromptToGpt(provideFilePathsTreePromptToGpt) {
    set({ provideFilePathsTreePromptToGpt })
  },
  updateFilePathsTreePrompt(promptOrFileTreeItem) {
    let result = ''

    if (typeof promptOrFileTreeItem === 'string')
      result = promptOrFileTreeItem

    if (Array.isArray(promptOrFileTreeItem)) {
      result += 'Note that these are the paths to the project the user is working on, and each path will be enclosed in single double quotes.'
      travelTree(promptOrFileTreeItem, (treeItem) => {
        if (treeItem.isLeaf && treeItem.otherInfo)
          result += `\n".${treeItem.otherInfo.projectRelativePath}"`
      })
    }

    set({ filePathsTreePrompt: result })
  },
  updateExpendedFilePaths(expendedFilePaths) {
    const result = typeof expendedFilePaths === 'function' ? expendedFilePaths(get().expendedFilePaths) : expendedFilePaths
    set({ expendedFilePaths: result })
  },
  updateCheckedFilePaths(checkedFilePaths) {
    const result = typeof checkedFilePaths === 'function' ? checkedFilePaths(get().checkedFilePaths) : checkedFilePaths
    set({ checkedFilePaths: result })
  },
})