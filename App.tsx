import AsyncStorage from "@react-native-async-storage/async-storage"
import { StatusBar } from "expo-status-bar"
import { DateTime } from "luxon"
import React, { useEffect, useState } from "react"
import { Text, TextStyle, View, ViewStyle } from "react-native"
import { GiftedChat, IMessage } from "react-native-gifted-chat"
import Markdown from "react-native-markdown-display"

export default function App() {
  const [messages, setMessages] = useState<IMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [ws, setWs] = useState<WebSocket>()

  useEffect(() => {
    const newWs = new WebSocket("ws://localhost:8000/ws")

    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setLoading(false)
      setMessages((previousMessages) =>
        GiftedChat.append(
          previousMessages.filter((m) => m._id !== data.id),
          [
            {
              _id: data.id,
              text: data.text,
              createdAt: new Date(),
              user: { _id: 1 },
              system: true,
            },
          ],
        ),
      )
    }

    async function getMessages() {
      const messageData = await AsyncStorage.getItem("messages")
      const messages: IMessage[] | null = messageData ? JSON.parse(messageData) : null

      setMessages(
        messages
          ? messages
          : [
              {
                _id: 1,
                text: "How can I help?",
                createdAt: new Date(),
                user: { _id: 1 },
                system: true,
              },
            ],
      )
    }

    getMessages()
    setWs(newWs)
    return () => {
      newWs.close()
    }
  }, [])

  useEffect(() => {
    async function saveMessages() {
      try {
        await AsyncStorage.setItem("messages", JSON.stringify(messages))
      } catch (e) {
        console.log(`Failed to save messages: ${e}`)
      }
    }

    saveMessages()
  }, [messages])

  return (
    <View style={$container}>
      <StatusBar style="auto" />
      <GiftedChat
        placeholder="How can I help?"
        messages={messages}
        onSend={(messages) => {
          if (ws && messages && messages.length > 0) {
            const message = messages[0]
            setMessages((previousMessages) => GiftedChat.append(previousMessages, messages))
            setLoading(true)
            ws.send(message.text)
          }
        }}
        user={{ _id: 2 }}
        renderAvatar={null}
        isTyping={loading}
        renderSystemMessage={(props) =>
          props.currentMessage?.text ? (
            <View style={$msgContainer}>
              <View style={$wrapper}>
                <Markdown
                  style={{
                    body: {
                      fontSize: 16,
                    },
                  }}
                >
                  {props.currentMessage?.text}
                </Markdown>
                {props.currentMessage?.createdAt ? (
                  <Text style={$msgTime}>
                    {DateTime.fromJSDate(new Date(props.currentMessage?.createdAt)).toFormat(
                      "h:mm a",
                    )}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const $container: ViewStyle = {
  flex: 1,
  paddingBottom: 20,
  paddingTop: 60,
}

const $msgContainer: ViewStyle = {
  flex: 1,
  marginTop: 5,
  marginBottom: 10,
  marginHorizontal: 10,
}

const $wrapper: ViewStyle = {
  borderRadius: 15,
  backgroundColor: "#f0f0f0",
  marginRight: 25,
  paddingHorizontal: 10,
  paddingBottom: 5,
  minHeight: 20,
  justifyContent: "flex-start",
}

const $msgTime: TextStyle = {
  fontSize: 10,
  marginTop: 5,
}
