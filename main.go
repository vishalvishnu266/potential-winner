// main.go is the entry point for both the WASM client and the local dev server.
//
// Build (WASM):
//   GOARCH=wasm GOOS=js go build -o web/app.wasm .
//
// Run dev server (serves the WASM and static assets):
//   go run .
package main

import (
	"log"
	"net/http"

	"github.com/maxence-charriere/go-app/v11/pkg/app"

	"github.com/yourorg/mobileapp/internal/i18n"
	"github.com/yourorg/mobileapp/internal/pages"
	"github.com/yourorg/mobileapp/internal/theme"
)

func main() {
	// Register routes. Each route maps a URL path to a component factory.
	app.Route("/", func() app.Composer { return &pages.Home{} })
	app.Route("/about", func() app.Composer { return &pages.About{} })
	app.Route("/settings", func() app.Composer { return &pages.Settings{} })

	// Initialise defaults on the client (browser/WASM) side.
	if app.IsClient {
		theme.Init()
		i18n.Init()
	}

	// RunWhenOnBrowser starts the app when compiled as WASM.
	app.RunWhenOnBrowser()

	// The following runs only on the server binary (go run .).
	handler := &app.Handler{
		Name:        "MobileApp",
		Description: "Capacitor + Go WASM mobile application",
		Title:       "MobileApp",
		Styles: []string{
			"/web/css/theme.css",
			"/web/css/base.css",
			"/web/css/layout.css",
			"/web/css/components.css",
		},
		Icon: app.Icon{
			Default: "/web/icon.png",
		},
		BackgroundColor: "#ffffff",
		ThemeColor:      "#111827",
		LoadingLabel:    "Loading…",
		Resources:       app.LocalDir("."),
	}

	http.Handle("/", handler)

	log.Println("Serving on http://localhost:8000")
	if err := http.ListenAndServe(":8000", nil); err != nil {
		log.Fatal(err)
	}
}
