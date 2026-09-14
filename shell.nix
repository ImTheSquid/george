let
    pkgs = import <nixpkgs> {};
in
pkgs.mkShell {
    buildInputs = with pkgs; [
      nodejs_22
      pnpm
      openssl   # secret generation for deploy
      jq
    ];
    }
