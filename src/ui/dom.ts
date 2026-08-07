const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

export const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export const icon = (path: string): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')

  const shape = document.createElementNS(SVG_NAMESPACE, 'path')
  shape.setAttribute('d', path)
  svg.append(shape)

  return svg
}
