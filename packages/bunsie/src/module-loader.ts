let moduleLoadVersion = "0";

export function setModuleLoadVersion(version: string) {
  moduleLoadVersion = version;
}

export function loadModule<T>(filePath: string): Promise<T> {
  const separator = filePath.includes("?") ? "&" : "?";
  return import(`${filePath}${separator}v=${moduleLoadVersion}`) as Promise<T>;
}
