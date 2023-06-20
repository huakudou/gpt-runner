import type { Request, Response } from 'express'
import type { ChatStreamReqParams, FailResponse, SuccessResponse } from '@nicepkg/gpt-runner-shared/common'
import { ChatStreamReqParamsSchema, EnvConfig, SECRET_KEY_PLACEHOLDER, STREAM_DONE_FLAG, buildFailResponse, buildSuccessResponse } from '@nicepkg/gpt-runner-shared/common'
import { PathUtils, sendFailResponse, verifyParamsByZod } from '@nicepkg/gpt-runner-shared/node'
import { createFileContext, loadUserConfig } from '@nicepkg/gpt-runner-core'
import { chatgptChain } from '../services'
import type { ControllerConfig } from './../types'

export const chatgptControllers: ControllerConfig = {
  namespacePath: '/chatgpt',
  controllers: [
    {
      url: '/chat-stream',
      method: 'post',
      handler: async (req: Request, res: Response) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        })

        const body = req.body as ChatStreamReqParams

        verifyParamsByZod(body, ChatStreamReqParamsSchema)

        const {
          messages = [],
          prompt = '',
          systemPrompt = '',
          singleFileConfig,
          contextFilePaths,
          rootPath,
        } = body

        let {
          // OpenaiBaseConfig
          openaiKey = '',
          modelName,
          temperature = 0.7,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
        } = singleFileConfig?.model || {}

        let finalPath = ''

        if (rootPath) {
          finalPath = PathUtils.resolve(rootPath)

          if (!PathUtils.isDirectory(finalPath)) {
            sendFailResponse(res, {
              message: 'rootPath is not a valid directory',
            })
            return
          }

          const { config: userConfig } = await loadUserConfig(finalPath)

          if (openaiKey === SECRET_KEY_PLACEHOLDER)
            openaiKey = ''

          openaiKey = openaiKey || userConfig?.model?.openaiKey || EnvConfig.get('OPENAI_KEY')
        }

        const sendSuccessData = (options: Omit<SuccessResponse, 'type'>) => {
          return res.write(`data: ${JSON.stringify(buildSuccessResponse(options))}\n\n`)
        }

        const sendFailData = (options: Omit<FailResponse, 'type'>) => {
          options.data = `Server Error: ${options.data}`
          return res.write(`data: ${JSON.stringify(buildFailResponse(options))}\n\n`)
        }

        let finalSystemPrompt = systemPrompt

        // provide file context
        if (contextFilePaths && finalPath) {
          const fileContext = await createFileContext({
            rootPath: finalPath,
            filePaths: contextFilePaths,
          })

          finalSystemPrompt += `\n${fileContext}`
        }

        try {
          const chain = await chatgptChain({
            messages,
            systemPrompt: finalSystemPrompt,
            openaiKey,
            modelName,
            temperature,
            maxTokens,
            topP,
            frequencyPenalty,
            presencePenalty,
            onTokenStream: (token: string) => {
              sendSuccessData({ data: token })
            },
            onError: (err) => {
              sendFailData({ data: err.message })
            },
          })

          await chain.call({
            'global.input': prompt,
          })
        }
        catch (error: any) {
          console.log('chatgptChain error', error)
          sendFailData({ data: String(error?.message || error) })
        }
        finally {
          sendSuccessData({
            data: STREAM_DONE_FLAG,
          })
          res.end()
        }
      },
    },
  ],

}
