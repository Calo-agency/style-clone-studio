\"use client\";

import { useMemo, useState } from \"react\";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Copy,
  RefreshCw,
  Wand2,
  LayoutTemplate,
  Type,
  Maximize2,
  Loader2,
  Settings,
  AlertCircle,
  X,
  CreditCard,
} from \"lucide-react\";

const MODEL_LABELS = [
  { key: \"openai\", label: \"OpenAI\" },
  { key: \"gemini\", label: \"Gemini / Imagen\" },
  { key: \"flux\", label: \"Replicate Flux\" },
  { key: \"sdxl\", label: \"Replicate SDXL\" },
] as const;

type GenerationResult = {
  results: Record<string, string | null>;
  finalPrompt: string;
  negativePrompt: string;
  manualPrompts: Record<string, string>;
};

const StyleCloneStudio = () => {
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [poseFile, setPoseFile] = useState<File | null>(null);
  const [description, setDescription] = useState(\"\");

  const [generatedPrompt, setGeneratedPrompt] = useState(\"\");
  const [negativePrompt, setNegativePrompt] = useState(\"\");
  const [generatedImages, setGeneratedImages] = useState<Record<string, string | null>>({});
  const [manualPrompts, setManualPrompts] = useState<Record<string, string>>({});

  const [status, setStatus] = useState<
    \"idle\" | \"analyzing\" | \"generating\" | \"done\" | \"error\" | \"partial_success\"
  >(\"idle\");
  const [statusMsg, setStatusMsg] = useState(\"\");
  const [showSettings, setShowSettings] = useState(false);

  const stylePreview = useMemo(
    () => (styleFile ? URL.createObjectURL(styleFile) : null),
    [styleFile]
  );
  const posePreview = useMemo(
    () => (poseFile ? URL.createObjectURL(poseFile) : null),
    [poseFile]
  );

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
    }
  };

  const handleProcess = async () => {
    if (!styleFile) {
      setStatus(\"error\");
      setStatusMsg(\"Envie uma imagem de referencia de estilo.\");
      return;
    }

    if (!description.trim()) {
      setStatus(\"error\");
      setStatusMsg(\"Escreva uma descricao do que voce quer gerar.\");
      return;
    }

    setStatus(\"analyzing\");
    setStatusMsg(\"Analisando o DNA visual da referencia...\");

    const body = new FormData();
    body.append(\"style\", styleFile);
    if (poseFile) body.append(\"pose\", poseFile);
    body.append(\"prompt\", description.trim());

    try {
      setStatus(\"generating\");
      setStatusMsg(\"Gerando com 4 IAs em paralelo...\");

      const res = await fetch(\"/api/generate\", { method: \"POST\", body });
      const data = (await res.json()) as GenerationResult & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || \"Falha ao gerar imagens.\");
      }

      setGeneratedPrompt(data.finalPrompt);
      setNegativePrompt(data.negativePrompt);
      setGeneratedImages(data.results ?? {});
      setManualPrompts(data.manualPrompts ?? {});
      setStatus(\"done\");
    } catch (error) {
      setStatus(\"error\");
      setStatusMsg(
        error instanceof Error ? error.message : \"Erro inesperado ao gerar.\"
      );
    }
  };

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className=\"min-h-screen bg-neutral-950 text-white font-sans selection:bg-indigo-500/30\">
      {showSettings && (
        <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4\">
          <div className=\"bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative\">
            <button
              onClick={() => setShowSettings(false)}
              className=\"absolute top-4 right-4 text-neutral-500 hover:text-white\"
            >
              <X size={20} />
            </button>

            <h3 className=\"text-xl font-bold mb-4 flex items-center gap-2\">
              <Settings className=\"text-indigo-500\" /> Configuracao
            </h3>

            <div className=\"space-y-4\">
              <div className=\"bg-amber-900/20 border border-amber-900/50 p-4 rounded-lg flex gap-3 items-start\">
                <AlertCircle className=\"text-amber-500 shrink-0 mt-0.5\" size={18} />
                <div className=\"space-y-2\">
                  <p className=\"text-sm text-amber-200 font-bold\">Atenção sobre a API:</p>
                  <p className=\"text-xs text-amber-200/80\">
                    As chaves ficam no servidor. Configure no Vercel ou no arquivo
                    .env.local.
                  </p>
                  <p className=\"text-xs text-amber-200/80\">
                    Se alguma chave estiver ausente, a geracao falhara.
                  </p>
                </div>
              </div>

              <div className=\"text-xs text-neutral-400\">
                Para rodar local, preencha:
                <div className=\"mt-2 bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-[11px]\">
                  OPENAI_API_KEY<br />
                  GEMINI_API_KEY<br />
                  REPLICATE_API_TOKEN<br />
                  POSTGRES_URL<br />
                  BLOB_READ_WRITE_TOKEN
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className=\"w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors\"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className=\"border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-20\">
        <div className=\"max-w-7xl mx-auto px-6 h-16 flex items-center justify-between\">
          <div className=\"flex items-center gap-2\">
            <div className=\"w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center\">
              <Sparkles className=\"w-5 h-5 text-white\" />
            </div>
            <h1 className=\"font-bold text-lg tracking-tight\">
              Style Clone <span className=\"text-neutral-500\">Studio</span>
            </h1>
          </div>
          <div className=\"flex items-center gap-4\">
            <div className=\"hidden md:flex text-xs font-mono text-neutral-500 items-center gap-4\">
              <span className=\"flex items-center gap-1\">
                <Wand2 size={12} /> OpenAI + Gemini
              </span>
              <span className=\"flex items-center gap-1\">
                <ImageIcon size={12} /> Replicate Flux + SDXL
              </span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className=\"p-2 rounded-full hover:bg-neutral-800 text-neutral-400\"
              title=\"Como configurar chaves\"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className=\"max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-4rem)]\">
        <div className=\"lg:col-span-3 flex flex-col gap-4\">
          <div className=\"flex items-center gap-2 text-indigo-400 mb-1\">
            <LayoutTemplate size={18} />
            <h2 className=\"text-sm font-bold uppercase tracking-wider\">1. Referência de Estilo</h2>
          </div>

          <div className=\"flex-1 bg-neutral-900 border border-dashed border-neutral-700 rounded-xl overflow-hidden relative group transition-all hover:border-indigo-500/50\">
            <input
              type=\"file\"
              accept=\"image/*\"
              onChange={(e) => handleImageUpload(e, setStyleFile)}
              className=\"absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10\"
            />
            {stylePreview ? (
              <img
                src={stylePreview}
                alt=\"Style Ref\"
                className=\"w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity\"
              />
            ) : (
              <div className=\"absolute inset-0 flex flex-col items-center justify-center text-neutral-500 p-6 text-center\">
                <Upload size={32} className=\"mb-3 opacity-50\" />
                <p className=\"text-sm font-medium\">Arraste a imagem de ESTILO aqui</p>
                <p className=\"text-xs opacity-60 mt-2\">Pinturas, Vetores, 3D, Fotos...</p>
              </div>
            )}
            {stylePreview && (
              <div className=\"absolute bottom-0 left-0 right-0 bg-neutral-900/80 p-2 text-xs text-center backdrop-blur-sm\">
                Clique para trocar
              </div>
            )}
          </div>

          <div className=\"bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-400 leading-relaxed\">
            <span className=\"text-indigo-400 font-bold\">Dica:</span> A IA ira extrair a paleta de cores, pinceladas e iluminacao desta imagem para aplicar no resultado.
          </div>
        </div>

        <div className=\"lg:col-span-4 flex flex-col gap-4\">
          <div className=\"flex items-center gap-2 text-purple-400 mb-1\">
            <Maximize2 size={18} />
            <h2 className=\"text-sm font-bold uppercase tracking-wider\">2. Estrutura & Pose</h2>
          </div>

          <div className=\"flex-1 flex flex-col gap-4\">
            <div className=\"h-1/2 bg-neutral-900 border border-dashed border-neutral-700 rounded-xl overflow-hidden relative group transition-all hover:border-purple-500/50\">
              <input
                type=\"file\"
                accept=\"image/*\"
                onChange={(e) => handleImageUpload(e, setPoseFile)}
                className=\"absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10\"
              />
              {posePreview ? (
                <img
                  src={posePreview}
                  alt=\"Pose Ref\"
                  className=\"w-full h-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity\"
                />
              ) : (
                <div className=\"absolute inset-0 flex flex-col items-center justify-center text-neutral-500 p-4 text-center\">
                  <ImageIcon size={28} className=\"mb-2 opacity-50\" />
                  <p className=\"text-sm\">Referência de Pose (Opcional)</p>
                  <p className=\"text-[10px] opacity-60\">Bonecos palito, rascunhos ou fotos</p>
                </div>
              )}
              {posePreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPoseFile(null);
                  }}
                  className=\"absolute top-2 right-2 p-1 bg-red-500/20 hover:bg-red-500 text-white rounded-full z-20\"
                  title=\"Remover Pose\"
                >
                  <RefreshCw size={12} />
                </button>
              )}
            </div>

            <div className=\"h-1/2 flex flex-col relative\">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder=\"Descreva o que voce quer na imagem... (Ex: Um guerreiro cyberpunk segurando um gato neon)\"
                className=\"w-full h-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none placeholder:text-neutral-600\"
              />
              <div className=\"absolute bottom-4 right-4 text-xs text-neutral-500 pointer-events-none\">
                <Type size={14} className=\"inline mr-1\" /> Texto
              </div>
            </div>
          </div>
        </div>

        <div className=\"lg:col-span-5 flex flex-col gap-4\">
          <div className=\"flex items-center gap-2 text-green-400 mb-1\">
            <Sparkles size={18} />
            <h2 className=\"text-sm font-bold uppercase tracking-wider\">3. Resultado Final</h2>
          </div>

          <div className=\"flex-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden relative flex flex-col\">
            <div className=\"flex-1 bg-neutral-950 relative flex items-center justify-center p-6\">
              {status === \"generating\" || status === \"analyzing\" ? (
                <div className=\"text-center p-8 animate-pulse\">
                  <Loader2 size={48} className=\"mx-auto mb-4 text-indigo-500 animate-spin\" />
                  <h3 className=\"text-lg font-bold text-white mb-1\">Processando...</h3>
                  <p className=\"text-sm text-neutral-400\">{statusMsg}</p>
                </div>
              ) : status === \"partial_success\" ? (
                <div className=\"text-center p-8\">
                  <div className=\"w-20 h-20 bg-amber-500/10 rounded-full mx-auto mb-4 flex items-center justify-center border border-amber-500/50\">
                    <CreditCard size={32} className=\"text-amber-500\" />
                  </div>
                  <h3 className=\"text-lg font-bold text-white mb-1\">Prompt Criado!</h3>
                  <p className=\"text-sm text-neutral-400 mb-4 max-w-xs mx-auto\">
                    O prompt foi gerado, mas alguma IA nao retornou imagem.
                  </p>
                </div>
              ) : Object.keys(generatedImages).length > 0 ? (
                <div className=\"grid grid-cols-2 gap-3 w-full\">
                  {MODEL_LABELS.map((model) => (
                    <div
                      key={model.key}
                      className=\"rounded-xl border border-neutral-800 bg-neutral-900/70 p-2\"
                    >
                      <div className=\"text-[10px] uppercase tracking-[0.2em] text-neutral-500\">
                        {model.label}
                      </div>
                      {generatedImages[model.key] ? (
                        <img
                          src={generatedImages[model.key] as string}
                          alt={`Resultado ${model.label}`}
                          className=\"mt-2 w-full h-40 rounded-lg object-cover\"
                        />
                      ) : (
                        <div className=\"mt-2 h-40 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-[10px] text-neutral-500\">
                          Sem imagem
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className=\"text-center text-neutral-600 p-8\">
                  <div className=\"w-20 h-20 bg-neutral-900 rounded-full mx-auto mb-4 flex items-center justify-center border border-neutral-800\">
                    <ArrowRight size={32} />
                  </div>
                  <p className=\"text-sm\">O resultado aparecera aqui</p>
                </div>
              )}
            </div>

            <div className=\"h-1/3 bg-neutral-900 border-t border-neutral-800 p-4 flex flex-col\">
              <div className=\"flex justify-between items-center mb-2\">
                <span className=\"text-xs font-bold text-neutral-400 uppercase\">
                  Prompt de Engenharia (Gerado pela IA)
                </span>
                <button
                  onClick={() => copyText(generatedPrompt)}
                  disabled={!generatedPrompt}
                  className=\"text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50\"
                >
                  <Copy size={12} /> Copiar
                </button>
              </div>
              <div
                className={`flex-1 bg-neutral-950 rounded-lg p-3 overflow-y-auto border transition-colors ${
                  status === \"partial_success\" ? \"border-indigo-500/50 bg-indigo-900/10\" : \"border-neutral-800\"
                }`}
              >
                <p className=\"text-xs text-neutral-300 font-mono leading-relaxed\">
                  {generatedPrompt || \"Aguardando geracao...\"}
                </p>
              </div>
              {negativePrompt && (
                <p className=\"mt-2 text-[11px] text-neutral-500\">
                  Negative prompt: {negativePrompt}
                </p>
              )}
              {Object.keys(manualPrompts).length > 0 && (
                <div className=\"mt-3 grid grid-cols-2 gap-2\">
                  {Object.entries(manualPrompts).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => copyText(value)}
                      className=\"rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-2 text-left text-[10px] text-neutral-300 hover:border-indigo-500\"
                    >
                      <div className=\"uppercase tracking-[0.2em] text-neutral-500\">Copiar para {key}</div>
                      <div className=\"mt-1 text-neutral-400\">{value}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={!styleFile || status === \"analyzing\" || status === \"generating\"}
            className={`h-16 rounded-xl font-bold text-lg tracking-wide uppercase shadow-lg transition-all flex items-center justify-center gap-3 ${
              !styleFile
                ? \"bg-neutral-800 text-neutral-500 cursor-not-allowed\"
                : \"bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/20\"
            }`}
          >
            {status === \"analyzing\"
              ? \"Analisando Estilo...\"
              : status === \"generating\"
              ? \"Gerando Imagens...\"
              : (
                <>
                  Recriar no Estilo <Wand2 size={20} />
                </>
              )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default StyleCloneStudio;
