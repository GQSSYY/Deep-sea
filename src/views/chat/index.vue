<template>
  <div class="chat-page h-full flex flex-col justify-center">
    <div class="h-50px leading-50px text-20px text-center px-20px" v-if="dataSources.length">
      {{ currentChatHistory?.title }}
    </div>
    <main class="overflow-hidden" :class="{ 'flex-1': dataSources.length }">
      <el-scrollbar ref="scrollRef">
        <div id="scroll-box" class="w-full max-w-screen-md m-auto">
          <div v-if="!dataSources.length" class="welcome text-center p-20px">
            <div class="welcome-mark">DS</div><div class="text-26px font-bold welcome-title">我是深海，很高兴见到你</div>
            <div class="text-14px mt-10px">写代码、读文件、整理思路，把任务交给我吧</div>
          </div>
          <div v-else>
            <Message v-for="(item, index) of dataSources" :key="index" :date-time="item.dateTime" :text="item.text"
              :reasoning="item.reasoning" :inversion="item.inversion" :error="item.error" :loading="item.loading" />
          </div>
        </div>
      </el-scrollbar>
    </main>
    <!-- 输入框 -->
    <footer>
      <div class="py-20px max-w-screen-md m-auto">
        <div class="composer p-15px rounded-20px">
          <div class="input-box">
            <el-input v-model="prompt" style="width: 100%" :autosize="{ minRows: 2, maxRows: 4 }" type="textarea"
              resize="none" placeholder="发送消息" @keypress="handleEnter" />
          </div>
          <div class="flex items-center justify-between">
            <div></div>
            <div class="flex items-center">
              <!-- <el-button :icon="Link" circle /> -->
              <el-button v-if="loading" type="primary" :icon="CloseBold" circle @click="handleStop" />
              <el-button v-else type="primary" :icon="Position" :disabled="!prompt" circle @click="handleSubmit" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Position, CloseBold } from '@element-plus/icons-vue'
import Message from './components/Message/index.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { chatCompletions } from '@/api/chat'
import { useChat } from './hooks/useChat'
import { useScroll } from './hooks/useScroll'
import { useChatStore } from '@/store'
import { useRoute } from 'vue-router'
import { useReadStream } from './hooks/useReadStream'
import { ss } from "@/utils/storage";
let controller = new AbortController()
const chatStore = useChatStore()
const route = useRoute()

// 会话方法
const { addChat, updateChat } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { handleStreamResponse } = useReadStream()
const { uuid } = route.params as { uuid: string }
// 输入框
const prompt = ref<string>('')
const loading = ref<boolean>(false)
// 对话信息
const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const currentChatHistory = computed(() => chatStore.getChatHistoryByCurrentActive)

// 是否开启多轮对话，开启后会带上之前的聊天信息
const usingContext = computed<boolean>(() => chatStore.usingContext)

// 输入框回车事件
function handleEnter(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}
async function handleSubmit() {
  if (!+uuid || +uuid === 0) {
    chatStore.addHistory({
      title: '新建会话',
      uuid: Date.now(),
      isEdit: false,
      visible: false,
    })
    ss.set('chatSubmitPrompt', prompt.value)
    return
  }
  onConversation()
}
async function onConversation() {
  let message = prompt.value
  if (loading.value) return
  if (!message || message.trim() === '') return
  // 流式输出信号
  controller = new AbortController()
  const conversationList = dataSources.value.filter(item => item.text).map(item => ({
    role: item.inversion ? 'user' : 'assistant',
    content: item.text,
  } as Chat.ConversationMessage))
  // 添加用户消息到对话框
  addChat(+uuid, {
    dateTime: new Date().toLocaleString(),
    text: message,
    inversion: true,
    error: false,
  })
  scrollToBottom()
  loading.value = true
  prompt.value = ''
  // 添加AI初始对话 思考信息
  addChat(+uuid, {
    dateTime: new Date().toLocaleString(),
    text: '',
    reasoning: '思考中...',
    loading: true,
    inversion: false,
    error: false,
  })
  scrollToBottom()
  // 开始发起请求
  try {
    const paramMsg = []
    if (usingContext.value) {
      // AI回复
      paramMsg.push(...conversationList)
    }
    paramMsg.push({ role: 'user', content: message })
    const response: any = await chatCompletions(controller.signal, paramMsg)
    await handleStreamResponse(response, (jsonData: any) => {
      const contentText = jsonData.choices[0]?.delta?.content
      if (contentText) {
        updateChat(+uuid, dataSources.value.length - 1, {
          text: contentText ?? '',
          inversion: false,
          error: false,
          loading: true,
        })
        scrollToBottomIfAtBottom()
      }
      // 思考信息
      const reasoning = jsonData.choices[0].delta.reasoning_content
      if (reasoning) {
        updateChat(+uuid, dataSources.value.length - 1, {
          reasoning: reasoning ?? '',
          reasoningTime: new Date().toLocaleString(),
          inversion: false,
          error: false,
          loading: true,
        })
        scrollToBottomIfAtBottom()
      }
    })
    updateChat(+uuid, dataSources.value.length - 1, {
      inversion: false,
      error: false,
      loading: false,
    })
    loading.value = false
    console.log('Stream ended')
  } catch (error: any) {
    console.log(error)
    loading.value = false
    if (error instanceof DOMException && error.name === 'AbortError') {
      updateChat(+uuid, dataSources.value.length - 1, {
        text: '\n\n用户手动中断。',
        inversion: false,
        error: false,
        loading: false,
      })
    } else {
      updateChat(+uuid, dataSources.value.length - 1, {
        text: '\n\n服务器异常，请稍后再试。',
        inversion: false,
        error: true,
        loading: false,
      })
    }
  }
}
function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}
onMounted(() => {
  if (!route.params.uuid) {
    chatStore.active = 1002
  }
  const promptValue = ss.get('chatSubmitPrompt')
  if (promptValue) {
    prompt.value = promptValue
    ss.set('chatSubmitPrompt', '')
    onConversation()
  }
  scrollToBottom()
})
onUnmounted(() => {
  if (loading.value) controller.abort()
})
</script>

<style scoped lang="scss">.chat-page { background:#f7f9fc; color:#172033; } .chat-title { color:#25324a; border-bottom:1px solid #e8edf5; background:rgba(255,255,255,.8); } .welcome { padding-top:14vh; } .welcome-mark { width:58px; height:58px; margin:0 auto 18px; display:grid; place-items:center; border-radius:16px; background:linear-gradient(135deg,#1d8cf8,#16b8a6); color:#fff; font-weight:800; box-shadow:0 10px 24px rgba(29,140,248,.2); } .welcome-title { color:#172033; } .composer { background:#fff; border:1px solid #e1e8f2; box-shadow:0 10px 30px rgba(36,59,95,.1); } .input-box :deep(.el-textarea__inner) { color:#172033; }
.input-box {
  :deep(.el-textarea) {
    .el-textarea__inner {
      background-color: transparent;
      color: #172033;
      box-shadow: none;
      padding: 0;
      font-size: 16px;
    }
  }
}
</style>


