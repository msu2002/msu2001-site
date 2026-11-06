# الموارد المفتوحة المصدر للتفريغ المحلي

كود Fahad Studio الأصلي مرخّص MIT في `LICENSE`. الموارد التالية لها تراخيصها المستقلة المحفوظة في `licenses/`:

| المورد | الإصدار أو المراجعة | الترخيص | المصدر |
|---|---|---|---|
| Transformers.js، حزمة المتصفح المضمّنة | 3.8.1 | Apache-2.0 | https://www.npmjs.com/package/@huggingface/transformers/v/3.8.1 |
| ONNX Runtime Web، ضمن حزمة Transformers.js وملفي mjs/wasm | 1.22.0-dev.20250409-89f8206ba4 | MIT وإشعارات الأطراف الثالثة | https://github.com/microsoft/onnxruntime |
| نموذج Whisper Base المحوّل إلى ONNX، تكميم q8 | onnx-community/whisper-base، المراجعة 27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c | Apache-2.0 بحسب بطاقة التحويل؛ ترخيص Whisper الأصلي MIT مرفق أيضًا | https://huggingface.co/onnx-community/whisper-base |
| نموذج Whisper الأصلي | openai/whisper-base | MIT | https://github.com/openai/whisper |

تسرد `models/manifest.json` مصادر ملفات النموذج وأحجامها وبصمات SHA-256. يضم المجلد `vendor/` نسخة المتصفح وملفي تشغيل WebAssembly. لا يتصل التطبيق بـnpm أو Hugging Face أو أي خدمة تفريغ عند استخدامه؛ تُخدَّم هذه الملفات من مجلد موقعك نفسه ويجري الاستدلال داخل المتصفح.

تضم الحزمة 49 عائلة خط مفتوح المصدر برخصة SIL OFL 1.1، موثقة في `fonts/CATALOG.md`، مع ملف OFL الأصلي لكل عائلة. لا تُضمَّن صور تجارية أو أصوات جاهزة. تبقى تراخيص وحقوق الوسائط التي يستوردها المستخدم مستقلة عن تراخيص التطبيق والنموذج.

القوالب الـ37 والموشن والخلفيات والحركات والتأثيرات والانتقالات في `creative.js` أعمال برمجية أصلية مضمّنة تحت MIT الخاص بالمشروع. لا تعتمد هذه المكتبات الإبداعية على صور أو موسيقى أو فيديو جاهز أو اشتراك أو موارد تأثيرات خارجية.

مؤثرات Cinematic Gold في `gold.js`، بما فيها الدخان الإجرائي والخامة الذهبية والإضاءة، كود أصلي تحت رخصة MIT الخاصة بالمشروع. لا تتضمن ملفات دخان تجارية أو صورًا أو مؤثرات صوتية من أطراف أخرى.

## خصوصية وخلفية (كشف الوجوه وفصل الشخص)

تعمل ميزة «خصوصية وخلفية» محليًا بالكامل بملفات من المجلد `vendor/` (ملفات MediaPipe وإشعارها MEDIAPIPE-NOTICE.txt) (حزم MediaPipe Solutions: `@mediapipe/face_detection` 0.4.1646425229 و`@mediapipe/selfie_segmentation` 0.1.1675465747، الترخيص Apache-2.0، المصدر https://github.com/google/mediapipe). لا تُرسل الصور إلى أي خادم. تحتاج هذه الملفات سياسة `'unsafe-eval'` في CSP بسبب مُحمِّل WebAssembly الخاص بالحزمة.
