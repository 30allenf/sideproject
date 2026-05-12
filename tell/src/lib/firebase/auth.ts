// Firebase removed — auth is handled via localStorage in useAuth.ts
export async function signInWithGoogle() {}
export async function signOut() {}
export function onAuthChange(_cb: (user: null) => void) { _cb(null); return () => {} }
export function currentUser() { return null }
