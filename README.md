# Priconne Exporter

A tool to parse, process, and export intercepted data from Princess Connect! Re:Dive game client.

The tool makes it easy to read what the game client is sending, receiving, and making use of said data.  
For example: exporting your inventory data to another tool such as [pcredivewiki.tw armory][pcredivewikitw-armory].

This tool was forked from [`Xzandro/sw-exporter`][sw-exporter], with Summoner's War specific parts gutted out, Princess Connect traffic [decryption][decrypt-info] functionality added, and remaining parts reused.

<img width="1038" alt="Screen Shot 2021-11-13 at 17 40 10" src="https://user-images.githubusercontent.com/25855364/141651723-7a971f23-6157-44c4-a8f2-25d80f6e3277.png">

## Usage
1. Download the tool in the [releases][releases-latest] page.
2. Install and run the tool to generate a <em>root certificate</em> and add this to your device (or emulator).
3. Point your device (or emulator) running Priconne to the <em>proxy server</em> started by the tool.

Detailed installation steps tailored to specific device/emulators can be found in the [wiki].

## Plugins
You can create your own plugins that will receive in-game events and data.  
What you do with that data is up to your imagination.  
Take a look at some of the [plugin source code][plugins-source] as reference.

---

More information about the tool can be found in the [GitHub Wiki][wiki-root].

[releases-latest]: https://github.com/FabulousCupcake/pcr-exporter/releases/latest
[pcredivewikitw-armory]: https://pcredivewiki.tw/Armory
[sw-exporter]: https://github.com/Xzandro/sw-exporter
[decrypt-info]: https://github.com/FabulousCupcake/pcr-exporter/wiki/Payload-Decryption
[wiki]: https://github.com/FabulousCupcake/pcr-exporter/wiki/Installation
[wiki-root]: https://github.com/FabulousCupcake/pcr-exporter/wiki
[plugins-source]: https://github.com/FabulousCupcake/pcr-exporter/tree/master/app/plugins
