import { defineStore } from "pinia";
import { router } from "@/router";
import { ss } from "@/utils/storage";
export const useChatStore = defineStore("chat-store", {
  state: (): Chat.ChatState => {
    const uuid = 1002;
    const localState = ss.get("chatStore");
    return {
      ...{
        history: [], // 历史对话列表
        active: uuid, // 当前对话id
        chat: [{ uuid, data: [] }], // 对话数据
        usingContext: true, // 开启多轮对话
      },
      ...localState,
    };
  },
  getters: {
    getChatHistoryByCurrentActive(state: Chat.ChatState) {
      const index = state.history.findIndex(
        (item) => item.uuid === state.active
      );
      if (index !== -1) return state.history[index];
      return null;
    },
    // 根据id获取对话信息
    getChatByUuid(state: Chat.ChatState) {
      return (uuid?: number) => {
        if (uuid) {
          return state.chat.find((item) => item.uuid === uuid)?.data ?? [];
        } else {
          return (
            state.chat.find((item) => item.uuid === state.active)?.data ?? []
          );
        }
      };
    },
  },
  actions: {
    createNewChat() {
      this.active = 1002;
      this.reloadRoute('');
    },
    addHistory(history: Chat.History, chatData: Chat.Chat[] = []) {
      this.history.unshift(history);
      this.chat.unshift({ uuid: history.uuid, data: chatData });
      this.active = history.uuid;
      this.reloadRoute(history.uuid);
    },
    deleteHistory(uuid: number) {
      const index = this.history.findIndex((item) => item.uuid === uuid);
      if (index !== -1) {
        this.history.splice(index, 1);
        this.recordState()
      }
      const chatIndex = this.chat.findIndex((item) => item.uuid === uuid);
      if (chatIndex !== -1) {
        this.chat.splice(chatIndex, 1);
        this.recordState()
      }
      if (this.active === uuid) {
        this.active = 1002;
        this.reloadRoute('');
      }
    },
    updateHistory(uuid: number, edit: Partial<Chat.History>) {
      const index = this.history.findIndex((item) => item.uuid === uuid);
      if (index !== -1) {
        this.history[index] = { ...this.history[index], ...edit };
        this.recordState()
      }
    },
    async setActive(uuid: number | undefined) {
      this.active = uuid || 1002;
      return await this.reloadRoute(uuid);
    },
    async reloadRoute(uuid?: number | '') {
      this.recordState()
      await router.push({ name: "Chat", params: { uuid } });
    },
    // 根据uuid添加对话
    addChatByUuid(uuid: number, chat: Chat.Chat) {
      const targetUuid = uuid || this.active || 1002;
      if (!uuid || uuid === 0) {
        if (this.history.length === 0) {
          const newUuid = Date.now();
          this.history.push({ uuid: newUuid, title: chat.text?.substring(0, 10), isEdit: false, visible: false });
          this.chat.push({ uuid: newUuid, data: [chat] });
          this.active = newUuid;
          this.recordState()
        } else {
          const target = this.chat.find(item => item.uuid === this.active) ?? this.chat[0]
          target.data.push(chat)
          const history = this.history.find(item => item.uuid === target.uuid)
          if (history?.title === "新建会话") history.title = chat.text?.substring(0, 50)
          this.recordState()
        }
        return
      }
      const index = this.chat.findIndex((item) => item.uuid === targetUuid);
      if (index !== -1) {
        this.chat[index].data.push(chat);
        const history = this.history.find(item => item.uuid === targetUuid)
        if (history?.title === "新建会话") history.title = chat.text?.substring(0, 50)
        this.recordState()
      }
    },
    updateChatByUuid(uuid: number, index: number, chat: Chat.Chat) {
      const targetUuid = uuid || this.active || 1002
      const target = this.chat.find(item => item.uuid === targetUuid)
      const current = target?.data[index]
      if (!target || !current) return
      // 每个流式片段都是增量内容，需要在 store 层统一拼接。
      const reasoning = chat.reasoning ? `${current.reasoning === '思考中...' ? '' : (current.reasoning ?? '')}${chat.reasoning}` : current.reasoning
      const text = chat.text ? `${current.text ?? ''}${chat.text}` : current.text
      target.data[index] = { ...current, ...chat, reasoning, text }
      this.recordState()
    },
    recordState() {
      ss.set("chatStore", this.$state);
    },
  },
});
