if status is-interactive
    # Commands to run in interactive sessions can go here

    # Set up fzf key bindings
    fzf --fish | source

    zoxide init fish | source

    starship init fish | source

end
