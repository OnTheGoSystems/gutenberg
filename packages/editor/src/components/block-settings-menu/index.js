/**
 * External dependencies
 */
import classnames from 'classnames';
import { castArray, first, last, every } from 'lodash';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Component } from '@wordpress/element';
import { IconButton, Dropdown, NavigableMenu, MenuItem } from '@wordpress/components';
import { withSelect, withDispatch } from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { cloneBlock, hasBlockSupport } from '@wordpress/blocks';
import { rawShortcut, displayShortcut } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import BlockModeToggle from './block-mode-toggle';
import ReusableBlockConvertButton from './reusable-block-convert-button';
import ReusableBlockDeleteButton from './reusable-block-delete-button';
import BlockSettingsKeyboardShortcuts from './keyboard-shortcuts';
import BlockHTMLConvertButton from './block-html-convert-button';
import BlockUnknownConvertButton from './block-unknown-convert-button';
import _BlockSettingsMenuFirstItem from './block-settings-menu-first-item';
import withDeprecatedUniqueId from '../with-deprecated-unique-id';

const shortcuts = {
	duplicate: {
		raw: rawShortcut.primaryShift( 'd' ),
		display: displayShortcut.primaryShift( 'd' ),
	},
	remove: {
		raw: rawShortcut.primaryAlt( 'backspace' ),
		display: displayShortcut.primaryAlt( 'bksp' ),
	},
};

export class BlockSettingsMenu extends Component {
	constructor() {
		super( ...arguments );
		this.state = {
			isFocused: false,
		};
		this.onFocus = this.onFocus.bind( this );
		this.onBlur = this.onBlur.bind( this );
	}

	onFocus() {
		this.setState( {
			isFocused: true,
		} );
	}

	onBlur() {
		this.setState( {
			isFocused: false,
		} );
	}

	render() {
		const {
			clientIds,
			onSelect,
			focus,
			isHidden,
			onDuplicate,
			onRemove,
			canDuplicate,
			isLocked,
		} = this.props;
		const { isFocused } = this.state;
		const blockClientIds = castArray( clientIds );
		const count = blockClientIds.length;
		const firstBlockClientId = blockClientIds[ 0 ];

		return (
			<div className="editor-block-settings-menu">
				<BlockSettingsKeyboardShortcuts
					onDuplicate={ onDuplicate }
					onRemove={ onRemove }
					shortcuts={ shortcuts }
				/>
				<Dropdown
					contentClassName="editor-block-settings-menu__popover"
					position="bottom left"
					renderToggle={ ( { onToggle, isOpen } ) => {
						const toggleClassname = classnames( 'editor-block-settings-menu__toggle', {
							'is-opened': isOpen,
							'is-visible': isFocused || isOpen || ! isHidden,
						} );
						const label = isOpen ? __( 'Hide Options' ) : __( 'More Options' );

						return (
							<IconButton
								className={ toggleClassname }
								onClick={ () => {
									if ( count === 1 ) {
										onSelect( firstBlockClientId );
									}
									onToggle();
								} }
								icon="ellipsis"
								label={ label }
								aria-expanded={ isOpen }
								focus={ focus }
								onFocus={ this.onFocus }
								onBlur={ this.onBlur }
							/>
						);
					} }
					renderContent={ ( { onClose } ) => (
						// Should this just use a DropdownMenu instead of a DropDown ?
						<NavigableMenu className="editor-block-settings-menu__content">
							<_BlockSettingsMenuFirstItem.Slot fillProps={ { onClose } } />
							{ count === 1 && (
								<BlockModeToggle
									clientId={ firstBlockClientId }
									onToggle={ onClose }
								/>
							) }
							{ count === 1 && (
								<BlockUnknownConvertButton
									clientId={ firstBlockClientId }
								/>
							) }
							{ count === 1 && (
								<BlockHTMLConvertButton
									clientId={ firstBlockClientId }
								/>
							) }
							{ ! isLocked && canDuplicate && (
								<MenuItem
									className="editor-block-settings-menu__control"
									onClick={ onDuplicate }
									icon="admin-page"
									shortcut={ shortcuts.duplicate.display }
								>
									{ __( 'Duplicate' ) }
								</MenuItem>
							) }
							{ count === 1 && (
								<ReusableBlockConvertButton
									clientId={ firstBlockClientId }
									onToggle={ onClose }
								/>
							) }
							<div className="editor-block-settings-menu__separator" />
							{ count === 1 && (
								<ReusableBlockDeleteButton
									clientId={ firstBlockClientId }
									onToggle={ onClose }
								/>
							) }
							{ ! isLocked && (
								<MenuItem
									className="editor-block-settings-menu__control"
									onClick={ onRemove }
									icon="trash"
									shortcut={ shortcuts.remove.display }
								>
									{ __( 'Remove Block' ) }
								</MenuItem>
							) }
						</NavigableMenu>
					) }
				/>
			</div>
		);
	}
}

export default compose( [
	withDeprecatedUniqueId,
	withSelect( ( select, { clientIds, rootClientId } ) => {
		const {
			getBlocksByClientId,
			getBlockIndex,
			getTemplateLock,
		} = select( 'core/editor' );

		const blocks = getBlocksByClientId( clientIds );

		const canDuplicate = every( blocks, ( block ) => {
			return !! block && hasBlockSupport( block.name, 'multiple', true );
		} );

		return {
			index: getBlockIndex( last( castArray( clientIds ) ), rootClientId ),
			isLocked: !! getTemplateLock( rootClientId ),
			blocks,
			canDuplicate,
			shortcuts,
		};
	} ),
	withDispatch( ( dispatch, { clientIds, rootClientId, blocks, index, isLocked, canDuplicate } ) => ( {
		onDuplicate() {
			if ( isLocked || ! canDuplicate ) {
				return;
			}

			const clonedBlocks = blocks.map( ( block ) => cloneBlock( block ) );
			dispatch( 'core/editor' ).insertBlocks(
				clonedBlocks,
				index + 1,
				rootClientId
			);
			if ( clonedBlocks.length > 1 ) {
				dispatch( 'core/editor' ).multiSelect(
					first( clonedBlocks ).clientId,
					last( clonedBlocks ).clientId
				);
			}
		},
		onRemove() {
			dispatch( 'core/editor' ).removeBlocks( clientIds );
		},
	} ) ),
	withDispatch( ( dispatch ) => ( {
		onSelect( clientId ) {
			dispatch( 'core/editor' ).selectBlock( clientId );
		},
	} ) ),
] )( BlockSettingsMenu );
