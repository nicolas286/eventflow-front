/**

* Ajoute un paramètre de version à une URL pour forcer le navigateur
* à recharger la ressource au lieu d'utiliser le cache.
*
* Si une `seed` est fournie (ex: updatedAt), la version sera stable
* tant que la seed ne change pas. Sinon, un timestamp actuel est utilisé.
*
* Exemple :
* withCacheBust("/logo.png")
* -> "/logo.png?v=1709552212345"
*
* withCacheBust("/logo.png", org.updated_at)
* -> "/logo.png?v=1709547600000"
  */
 
export function withCacheBust(url: string | null | undefined, seed?: string | number | Date | null) {
  const u = (url ?? "").trim();
  if (!u) return u;

const version =
seed != null
? new Date(seed).getTime() || Date.now()
: Date.now();

const sep = u.includes("?") ? "&" : "?";
return `${u}${sep}v=${version}`;
}
