// 設定テンプレート — このファイルをコピーして config.ts を作成
// cp config.example.ts config.ts
//
// 値の取得方法:
//   API_BASE_URL: sam deploy 後に出力される ApiBaseUrl
//   API_KEY_VALUE: aws apigateway get-api-key --api-key <KeyId> --include-value --query value --output text

export const API_BASE_URL = 'https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/v1';
export const API_KEY_VALUE = '<your-api-key>';
