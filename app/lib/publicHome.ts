'use client'

/** Replace protected history and discard cached signed-in route payloads. */
export function returnToPublicHome() { window.location.replace('/') }
