export async function fetchGarden() {
  const response = await fetch("/api/garden");
  if (!response.ok) throw new Error("Garden could not be reached.");
  return response.json();
}

export async function sendGardenAction(action, payload = {}) {
  const response = await fetch("/api/garden/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body.message ?? "Garden action failed.");
    error.payload = body;
    throw error;
  }

  return body;
}
