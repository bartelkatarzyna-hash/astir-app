(async function () {
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get("agentation") === "1";

  if (!enabled) {
    return;
  }

  const mount = document.createElement("div");
  mount.id = "astir-agentation";
  document.body.appendChild(mount);

  try {
    const React = await import("react");
    const ReactDOM = await import("react-dom/client");
    const { Agentation } = await import("https://esm.sh/agentation@3.0.2?external=react");

    ReactDOM.createRoot(mount).render(
      React.createElement(Agentation, {
        endpoint: "http://localhost:4747",
        copyToClipboard: true
      })
    );
  } catch (error) {
    console.error("Agentation failed to load", error);
  }
})();
