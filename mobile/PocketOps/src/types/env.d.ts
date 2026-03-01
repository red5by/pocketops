// React Native では Metro が process.env を解決するが TypeScript は型定義を必要とする
declare const process: {
  env: Partial<Record<string, string>>;
};
