// Force-link the lib crate so that all #[command] inventory registrations
// are included in this binary.
use lonanote_core as _;

fn main() -> anyhow::Result<()> {
    let output_path = std::env::args()
        .nth(1)
        .expect("Please provide an output path for the generated API metadata JSON file");
    if output_path.is_empty() {
        panic!("Output path cannot be empty");
    }
    let output_path = std::path::PathBuf::from(output_path);
    let output_path = if output_path.is_absolute() {
        output_path
    } else {
        std::env::current_dir()?.join(output_path)
    };
    println!("output path: {}", output_path.display());
    cmdreg::reg_all_commands()?;
    cmdreg::export_commands_json(&output_path).unwrap();

    println!(
        "API metadata JSON file generated successfully at: {}",
        output_path.display()
    );

    Ok(())
}
