import json
import os
import uuid
from typing import AsyncGenerator, NoReturn

import google.generativeai as genai
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-pro")

app = FastAPI()

PROMPT = """
You are a helpful assistant, skilled in explaining complex concepts in simple terms.

{message}
"""  # noqa: E501


async def get_ai_response(message: str) -> AsyncGenerator[str, None]:
    """
    Gemini Response
    """
    response = await model.generate_content_async(
        PROMPT.format(message=message), stream=True
    )

    msg_id = str(uuid.uuid4())
    all_text = ""
    async for chunk in response:
        if chunk.candidates:
            for part in chunk.candidates[0].content.parts:
                all_text += part.text
                yield json.dumps({"id": msg_id, "text": all_text})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> NoReturn:
    """
    Websocket for AI responses
    """
    await websocket.accept()
    while True:
        message = await websocket.receive_text()
        async for text in get_ai_response(message):
            await websocket.send_text(text)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_level="debug",
        reload=True,
    )
