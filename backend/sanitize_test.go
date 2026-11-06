package main

import (
	"strings"
	"testing"
)

func TestSanitizeHTMLKeepsTableStructureAndSafeStyles(t *testing.T) {
	input := `<table style="min-width: 300px"><colgroup><col style="width: 120px"></colgroup><tbody><tr><th colspan="2" style="text-align: center">Head</th></tr><tr><td rowspan="2">Cell</td></tr></tbody></table>`

	out := sanitizeHTML(input)
	for _, want := range []string{
		"<table",
		"<colgroup>",
		"<col",
		"<tbody>",
		"<tr>",
		"<th",
		`colspan="2"`,
		`rowspan="2"`,
		"text-align: center",
		"min-width: 300px",
		"width: 120px",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("expected sanitized output to contain %q, got %q", want, out)
		}
	}
}

func TestSanitizeHTMLDropsUnsafeStyles(t *testing.T) {
	out := sanitizeHTML(`<p style="color:red;text-align:center;background:url(javascript:alert(1));position:fixed">text</p>`)

	if !strings.Contains(out, "text-align: center") {
		t.Errorf("expected safe text-align to remain, got %q", out)
	}
	for _, unwanted := range []string{"color:", "background", "javascript", "position"} {
		if strings.Contains(out, unwanted) {
			t.Errorf("expected %q to be removed, got %q", unwanted, out)
		}
	}
}
