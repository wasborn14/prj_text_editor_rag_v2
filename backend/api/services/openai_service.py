"""OpenAI APIサービス"""
import os
from typing import List, Dict
from openai import OpenAI
import json

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.client = OpenAI(api_key=api_key)

    def generate_response(self, query: str, context: str, max_tokens: int = 500) -> str:
        """
        コンテキストを基に質問に回答を生成

        Args:
            query: ユーザーの質問
            context: 検索で取得した関連ドキュメント
            max_tokens: 生成する最大トークン数

        Returns:
            生成された回答
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # コスト効率の良いモデル
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "あなたは提供されたドキュメントを基に質問に答えるアシスタントです。\n"
                            "以下のルールに従ってください：\n"
                            "1. 提供されたコンテキストの情報のみを使用して回答する\n"
                            "2. コンテキストに情報がない場合は、その旨を明確に伝える\n"
                            "3. 簡潔で正確な回答を心がける\n"
                            "4. コードやコマンドはMarkdown形式で記述する"
                        )
                    },
                    {
                        "role": "user",
                        "content": f"コンテキスト:\n{context}\n\n質問: {query}"
                    }
                ],
                max_tokens=max_tokens,
                temperature=0.3,  # 低めの温度で一貫性のある回答
                top_p=0.9
            )

            return response.choices[0].message.content

        except Exception as e:
            print(f"OpenAI API error: {e}")
            return f"エラーが発生しました: {str(e)}"

    def summarize_code(self, code: str, language: str = "unknown") -> str:
        """
        コードの要約を生成

        Args:
            code: 要約するコード
            language: プログラミング言語

        Returns:
            コードの要約
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "コードを簡潔に要約してください。主な機能と重要な処理を説明してください。"
                    },
                    {
                        "role": "user",
                        "content": f"言語: {language}\n\nコード:\n```\n{code}\n```"
                    }
                ],
                max_tokens=200,
                temperature=0.3
            )

            return response.choices[0].message.content

        except Exception as e:
            print(f"Code summarization error: {e}")
            return "コードの要約に失敗しました"