<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Human } from "@vladmandic/human";
  import { authClient } from "./auth";

  let videoEl = $state<HTMLVideoElement>();
  let canvasEl = $state<HTMLCanvasElement>();

  let human: Human;
  let loading = $state(true);
  let disabled = $state(true);
  let start = $state(false);

  let errorMessage = $state("");
  let documentNumber = $state("1097727605");

  const session = authClient.useSession;

  async function isWebGPUSupported() {
    if (!navigator.gpu) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return false;
    }
    const device = await adapter.requestDevice();
    if (!device) {
      return false;
    }

    return true;
  }

  onMount(async () => {
    const webgpuSupported = await isWebGPUSupported();
    human = new Human({
      backend: webgpuSupported ? "webgpu" : "webgl",
      modelBasePath: "./models",
    });
    try {
      await human.load();
      loading = false;
      disabled = false;
    } catch (error) {
      errorMessage = (error as Error).message;
    }
  });

  async function registerPasskey() {
    loading = true;
    disabled = true;
    const { data, error } = await authClient.passkey.addPasskey({
      authenticatorAttachment: "cross-platform",
      name: `Passkey de ${documentNumber}`
    });
    if (error) {
      errorMessage = "Error al registrar la passkey.";
      loading = false;
      disabled = false;
      return;
    }
    console.log("Passkey registrada:", data);
    const signIn = await signInWithPasskey();
    if (!signIn) {
      errorMessage = "Error al iniciar sesión con la passkey.";
      loading = false;
      disabled = false;
      return;
    }
    loading = false;
    disabled = false;
  }

  async function signInWithPasskey() {
    const { data, error } = await authClient.signIn.passkey({ autoFill: true });
    if (error) {
      console.error("Error al autenticar:", error);
      return false;
    }
    console.log("Autenticado con passkey:", data);
    return true;
  }

  async function onSignIn() {
    loading = true;
    disabled = true;
    const { error } = await authClient.signIn.anonymous();
    if (error) {
      errorMessage = "Error al iniciar sesión anónima.";
    }
    loading = false;
    disabled = false;
  }

  async function onPlay() {
    start = true;
    try {
      if (!videoEl) {
        videoEl = document.querySelector("video")!;
        canvasEl = document.querySelector("canvas")!;
      };
      disabled = true;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      detectLoop();
    } catch (error) {
      errorMessage = (error as Error).message;
    }
  };

  onDestroy(() => {
    if (!videoEl) return;
    videoEl.pause();
  });

  const detectLoop = async () => {
    if (!videoEl || videoEl.readyState < 2) {
      requestAnimationFrame(detectLoop);
      return;
    }

    const result = await human.detect(videoEl, {
      body: { enabled: false },
      face: {
        enabled: true,
        detector: { rotation: true, maxDetected: 1 },
        mesh: { enabled: true },
        iris: { enabled: true },
        description: { enabled: true },
        emotion: { enabled: true },
        liveness: { enabled: true },
        antispoof: { enabled: true },
      },
      hand: { enabled: false },
      gesture: { enabled: true },
      object: { enabled: false },
    });
    if (!canvasEl) return;

    const ctx = canvasEl.getContext("2d")!;
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    console.log(result);
    human.draw.all(canvasEl, result);

    requestAnimationFrame(detectLoop);
  };
</script>

<main class="h-svh w-svw flex flex-col py-8 justify-center items-center">
  <h1 class="text-3xl font-bold mb-4 text-center">
    POC RBM SDK Liveness
  </h1>
  <section class="flex justify-center items-center">
    {#if errorMessage}
      <p class="text-red-500 mt-4">{errorMessage}</p>
    {:else}
      {#if start}
        <section style="position:relative; width:640px; height:480px;">
          <video bind:this={videoEl} muted></video>
          <canvas bind:this={canvasEl} style="position:absolute; top:0; left:0;"></canvas>
        </section>
      {:else}
        <article class="card w-80 bg-base-100 shadow-xl">
          <div class="card-body">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">DocumentNumbero de identidad</legend>
              <input type="text" class="input input-accent" placeholder="10000000" bind:value={documentNumber} />
            </fieldset>

            {#if $session.data?.session}
              <button class="btn btn-block btn-accent" onclick={registerPasskey} disabled={disabled}>
                {#if loading}
                  <span class="loading loading-spinner"></span>
                  Registrando Passkey...
                {:else}
                  Registrar Passkey
                {/if}
              </button>
              <button class="btn btn-block btn-accent" onclick={onPlay} disabled={disabled}>
                {#if loading}
                  <span class="loading loading-spinner"></span>
                  Cargando Modelos...
                {:else}
                  Iniciar Detección
                {/if}
              </button>
            {:else}
              <button class="btn btn-block btn-accent" onclick={onSignIn} disabled={disabled}>
                {#if loading}
                  <span class="loading loading-spinner"></span>
                  Iniciando Sesión...
                {:else}
                  Iniciar Sesión Anónima
                {/if}
              </button>
            {/if}
          </div>
        </article>
      {/if}
    {/if}
  </section>
</main>

