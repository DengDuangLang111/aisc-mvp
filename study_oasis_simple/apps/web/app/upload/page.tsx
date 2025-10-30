"use client";

import { useRef, useState } from "react";

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("");

  async function handleUpload() {
  const file = fileRef.current?.files?.[0];
  if (!file) {
    setStatus("请选择一个文件");
    return;
  }

  // A 步：确认我们拿到了文件对象（学习点：File 是浏览器提供的二进制对象）
  console.log("选中文件：", file.name, file.type, file.size, "bytes");
  setStatus(`已读取：${file.name}`);

  // B 步：把文件装进 FormData（学习点：上传二进制必须用 multipart/form-data）
  const fd = new FormData();
  // 字段名必须叫 'file' —— 以后服务端会按这个名字取；前后端要对齐
  fd.append("file", file);

  try {
    // 学习点：当 body 是 FormData 时，浏览器会自动加
    // Content-Type: multipart/form-data; boundary=xxxx
    // 你**不要**手动写 headers，避免边界串出错
    const res = await fetch("http://localhost:4000/upload", {
      method: "POST",
      body: fd,
    });

    // 现在后端还没写，这里大概率会抛错/404；但能证明前端会发请求了
    const json = await res.json();
    console.log("后端返回：", json);
    setStatus(`上传成功，ID: ${json.id}`);
  } catch (err) {
    // 学习点：先把“能正确发出 FormData”作为阶段目标
    console.warn("后端未就绪，报错是预期的：", err);
    setStatus("前端已发出请求（后端待实现）");
  }
}


  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Upload File</h1>

      <input ref={fileRef} type="file" />
      <button
        onClick={handleUpload}
        className="ml-3 border px-4 py-1 rounded"
      >
        Upload
      </button>

      {status && <p className="text-sm text-gray-600">{status}</p>}
    </main>
  );
}
