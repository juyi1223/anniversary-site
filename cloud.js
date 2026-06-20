(function () {
  const config = window.YIXIN_CLOUD_CONFIG || {};
  let client = null;
  let lastError = "";

  function isEnabled() {
    return Boolean(config.enabled && config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  }

  function getClient() {
    if (!isEnabled()) return null;
    if (!client) client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return client;
  }

  async function loadContent(key, fallback) {
    const supabaseClient = getClient();
    if (!supabaseClient) return fallback;

    const { data, error } = await supabaseClient
      .from(config.tableName)
      .select("content")
      .eq("id", key)
      .maybeSingle();

    if (error) {
      lastError = error.message || "Cloud load failed";
      console.warn("Cloud load failed:", lastError);
      return fallback;
    }
    return data?.content ?? fallback;
  }

  async function saveContent(key, content) {
    const supabaseClient = getClient();
    if (!supabaseClient) return false;

    const { error } = await supabaseClient.from(config.tableName).upsert({
      id: key,
      content,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      lastError = error.message || "Cloud save failed";
      console.warn("Cloud save failed:", lastError);
      return false;
    }
    lastError = "";
    return true;
  }

  async function uploadFiles(section, files) {
    const supabaseClient = getClient();
    if (!supabaseClient) return null;

    const selectedFiles = Array.from(files || []);
    const uploaded = [];

    for (const file of selectedFiles) {
      const cleanName = file.name.replace(/[^\w.\-]+/g, "-");
      const filePath = `${section}/${Date.now()}-${Math.random().toString(16).slice(2)}-${cleanName}`;
      const { error } = await supabaseClient.storage.from(config.storageBucket).upload(filePath, file, {
        upsert: true,
        contentType: file.type || undefined,
      });

      if (error) {
        lastError = error.message || "Cloud upload failed";
        console.warn("Cloud upload failed:", lastError);
        continue;
      }

      const { data } = supabaseClient.storage.from(config.storageBucket).getPublicUrl(filePath);
      uploaded.push({ name: file.name, data: data.publicUrl, path: filePath });
    }

    return uploaded;
  }

  function getLastError() {
    return lastError;
  }

  window.YiXinCloud = {
    isEnabled,
    loadContent,
    saveContent,
    uploadFiles,
    getLastError,
  };
})();
