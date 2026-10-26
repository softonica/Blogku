package main

import "embed"

//go:embed all:dist
var embeddedDist embed.FS
